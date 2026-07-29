import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ title, children, onClose, wide = false }) {
  const modalRef = useRef(null);
  const triggerRef = useRef(
    typeof document !== "undefined" ? document.activeElement : null,
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = Array.from(
        modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    addEventListener("keydown", handleKeyDown);
    return () => removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const node = modalRef.current;
    const trigger = triggerRef.current;
    if (node && !node.contains(document.activeElement)) {
      const focusable = node.querySelector(FOCUSABLE_SELECTOR);
      (focusable || node).focus();
    }
    return () => {
      if (trigger?.focus) trigger.focus();
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onClose()
      }
    >
      <section
        ref={modalRef}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
