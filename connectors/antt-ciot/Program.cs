using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseWindowsService(options =>
{
    options.ServiceName = "To Do Green ANTT CIOT Connector";
});

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});
builder.Services.Configure<ConnectorOptions>(builder.Configuration.GetSection("Connector"));
builder.Services.Configure<AnttProcessOptions>(builder.Configuration.GetSection("AnttProcess"));
builder.Services.AddSingleton<ConnectorAuth>();
builder.Services.AddSingleton<AnttCiotProcessClient>();

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new
{
    status = "operacional",
    service = "todogreen-antt-ciot-connector",
    checkedAt = DateTimeOffset.UtcNow,
}));

app.MapPost("/ciot", async (
    HttpRequest httpRequest,
    CiotConnectorRequest request,
    ConnectorAuth auth,
    AnttCiotProcessClient antt,
    CancellationToken cancellationToken) =>
{
    if (!auth.IsAuthorized(httpRequest))
        return Results.Json(new { error = "Token do conector invalido." }, statusCode: StatusCodes.Status401Unauthorized);

    var validation = CiotValidator.Validate(request);
    if (validation is not null)
        return Results.Json(new { error = validation }, statusCode: StatusCodes.Status400BadRequest);

    try
    {
        var response = await antt.GenerateAsync(request, cancellationToken);
        if (!CiotValidator.IsCiotCode(response.CiotCode))
            return Results.Json(new
            {
                error = "ANTT nao retornou CIOT valido de 12 digitos.",
                response.Protocol,
                response.Raw,
            }, statusCode: StatusCodes.Status502BadGateway);

        return Results.Ok(response);
    }
    catch (ConnectorNotConfiguredException error)
    {
        return Results.Json(new { error = error.Message }, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (OperationCanceledException)
    {
        return Results.Json(new { error = "Tempo limite ao gerar CIOT na ANTT." }, statusCode: StatusCodes.Status504GatewayTimeout);
    }
    catch (Exception error)
    {
        return Results.Json(new { error = "Falha ao acionar integracao oficial ANTT.", detail = error.Message }, statusCode: StatusCodes.Status502BadGateway);
    }
});

app.Run();

public sealed class ConnectorAuth(IConfiguration configuration)
{
    private readonly string _token = configuration["Connector:Token"] ?? "";

    public bool IsAuthorized(HttpRequest request)
    {
        if (string.IsNullOrWhiteSpace(_token))
            return false;

        var header = request.Headers.Authorization.ToString();
        const string prefix = "Bearer ";
        if (!header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return false;

        var provided = header[prefix.Length..].Trim();
        return FixedTimeEquals(provided, _token);
    }

    private static bool FixedTimeEquals(string provided, string expected)
    {
        var providedBytes = Encoding.UTF8.GetBytes(provided);
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        return providedBytes.Length == expectedBytes.Length &&
            CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes);
    }
}

public sealed class AnttCiotProcessClient(
    Microsoft.Extensions.Options.IOptions<AnttProcessOptions> options,
    Microsoft.Extensions.Options.IOptions<ConnectorOptions> connectorOptions,
    ILogger<AnttCiotProcessClient> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly AnttProcessOptions _options = options.Value;
    private readonly ConnectorOptions _connectorOptions = connectorOptions.Value;

    public async Task<CiotConnectorResponse> GenerateAsync(CiotConnectorRequest request, CancellationToken cancellationToken)
    {
        if (_connectorOptions.DryRun)
        {
            return new CiotConnectorResponse(
                CiotCode: "000000000000",
                Protocol: $"DRYRUN-{DateTimeOffset.UtcNow:yyyyMMddHHmmss}",
                Raw: new Dictionary<string, object?> { ["dryRun"] = true });
        }

        if (string.IsNullOrWhiteSpace(_options.ExecutablePath))
            throw new ConnectorNotConfiguredException("Configure AnttProcess:ExecutablePath com o adaptador oficial da ANTT.");

        if (!File.Exists(_options.ExecutablePath))
            throw new ConnectorNotConfiguredException($"Adaptador ANTT nao encontrado: {_options.ExecutablePath}");

        var workDir = string.IsNullOrWhiteSpace(_options.WorkingDirectory)
            ? Path.GetDirectoryName(_options.ExecutablePath)!
            : _options.WorkingDirectory;

        var tempDir = Path.Combine(Path.GetTempPath(), "todogreen-ciot", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        var inputPath = Path.Combine(tempDir, "request.json");
        var outputPath = Path.Combine(tempDir, "response.json");

        try
        {
            await File.WriteAllTextAsync(inputPath, JsonSerializer.Serialize(request, JsonOptions), cancellationToken);
            var arguments = BuildArguments(inputPath, outputPath, request);
            using var process = new Process();
            process.StartInfo = new ProcessStartInfo
            {
                FileName = _options.ExecutablePath,
                Arguments = arguments,
                WorkingDirectory = workDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            logger.LogInformation("Gerando CIOT via adaptador ANTT em {Environment}.", request.Environment);

            process.Start();
            var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
            var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);

            var stdout = await stdoutTask;
            var stderr = await stderrTask;

            if (process.ExitCode != 0)
                throw new InvalidOperationException($"Adaptador ANTT retornou codigo {process.ExitCode}: {TrimForLog(stderr)}");

            var rawText = File.Exists(outputPath)
                ? await File.ReadAllTextAsync(outputPath, cancellationToken)
                : stdout;

            var payload = ParseObject(rawText);
            var ciotCode = FirstText(payload, "ciotCode", "ciot", "codigoCiot", "codigoCIOT", "codigo", "code", "numeroCiot", "numeroCIOT");
            var protocol = FirstText(payload, "protocol", "protocolo", "receipt", "recibo");

            return new CiotConnectorResponse(ciotCode, protocol, payload);
        }
        finally
        {
            try { Directory.Delete(tempDir, recursive: true); }
            catch (Exception error) { logger.LogWarning(error, "Nao foi possivel remover arquivos temporarios do CIOT."); }
        }
    }

    private string BuildArguments(string inputPath, string outputPath, CiotConnectorRequest request)
    {
        var template = string.IsNullOrWhiteSpace(_options.ArgumentsTemplate)
            ? "--input \"{input}\" --output \"{output}\" --base-url \"{baseUrl}\" --environment \"{environment}\""
            : _options.ArgumentsTemplate;

        return template
            .Replace("{input}", inputPath, StringComparison.OrdinalIgnoreCase)
            .Replace("{output}", outputPath, StringComparison.OrdinalIgnoreCase)
            .Replace("{baseUrl}", request.BaseUrl, StringComparison.OrdinalIgnoreCase)
            .Replace("{environment}", request.Environment, StringComparison.OrdinalIgnoreCase);
    }

    private static Dictionary<string, object?> ParseObject(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return new Dictionary<string, object?>();

        using var doc = JsonDocument.Parse(value);
        return JsonSerializer.Deserialize<Dictionary<string, object?>>(doc.RootElement.GetRawText(), JsonOptions)
            ?? new Dictionary<string, object?>();
    }

    private static string FirstText(Dictionary<string, object?> payload, params string[] keys)
    {
        foreach (var key in keys)
        {
            if (!payload.TryGetValue(key, out var value) || value is null)
                continue;

            var text = value switch
            {
                JsonElement element when element.ValueKind == JsonValueKind.String => element.GetString(),
                JsonElement element when element.ValueKind == JsonValueKind.Number => element.GetRawText(),
                _ => Convert.ToString(value),
            };
            if (!string.IsNullOrWhiteSpace(text))
                return text.Trim();
        }

        return "";
    }

    private static string TrimForLog(string value)
    {
        value = value.ReplaceLineEndings(" ").Trim();
        return value.Length <= 500 ? value : value[..500];
    }
}

public static class CiotValidator
{
    public static string? Validate(CiotConnectorRequest request)
    {
        if (!string.Equals(request.Mode, "direct_api", StringComparison.OrdinalIgnoreCase))
            return "Modo invalido para geracao CIOT.";

        if (request.RequiresIpef)
            return "Este conector e exclusivo para integracao direta sem IPEF.";

        if (!Uri.TryCreate(request.BaseUrl, UriKind.Absolute, out var baseUrl) || baseUrl.Scheme != Uri.UriSchemeHttps)
            return "Base URL ANTT deve ser HTTPS.";

        if (request.Certificate is null)
            return "Certificado ICP-Brasil nao informado.";

        if (!string.Equals(request.Certificate.Standard, "ICP-Brasil", StringComparison.OrdinalIgnoreCase))
            return "Certificado deve usar padrao ICP-Brasil.";

        if (!string.Equals(request.Certificate.Type, "A1", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(request.Certificate.Type, "A3", StringComparison.OrdinalIgnoreCase))
            return "Tipo de certificado deve ser A1 ou A3.";

        if (request.Ciot is null)
            return "Payload CIOT nao informado.";

        return null;
    }

    public static bool IsCiotCode(string value) => value.Length == 12 && value.All(char.IsDigit);
}

public sealed record ConnectorOptions
{
    public string Token { get; init; } = "";
    public bool DryRun { get; init; }
}

public sealed record AnttProcessOptions
{
    public string ExecutablePath { get; init; } = "";
    public string WorkingDirectory { get; init; } = "";
    public string ArgumentsTemplate { get; init; } = "";
}

public sealed record CiotConnectorRequest(
    string Mode,
    bool RequiresIpef,
    string Environment,
    string BaseUrl,
    CiotCertificate Certificate,
    JsonElement Ciot);

public sealed record CiotCertificate(
    string Standard,
    string Type,
    string? CertificateEnvKey,
    string? CertificatePasswordEnvKey,
    string? A3ConnectorEnvKey,
    string? PfxBase64,
    string? Password);

public sealed record CiotConnectorResponse(
    string CiotCode,
    string Protocol,
    Dictionary<string, object?> Raw);

public sealed class ConnectorNotConfiguredException(string message) : Exception(message);
