// ===== Urgência de uma tarefa =====
//
// Em dias ÚTEIS, não corridos: "vence em 2 dias" numa sexta significa terça, e
// tratar sábado e domingo como prazo é o tipo de erro que faz a pessoa perder
// a confiança no aviso.

import { today } from "../../domain.js";
import { businessDaysBetween } from "../../domain/datas.js";

export const taskUrgency = (task) => {
  if (!task?.due || task.status === "Concluído") return null;
  const diff = businessDaysBetween(today(), task.due);
  if (diff === null) return null;
  if (diff < 0) return { text: "Prazo vencido", tone: "danger" };
  if (diff === 0) return { text: "Vence hoje", tone: "danger" };
  if (diff <= 2)
    return {
      text: diff === 1 ? "Vence em 1 dia útil" : `Vence em ${diff} dias úteis`,
      tone: "warning",
    };
  return null;
};
