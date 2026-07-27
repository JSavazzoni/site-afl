export default function SiteFooter() {
  return (
    <footer
      className="mt-auto shrink-0 border-t px-6 py-8 text-center text-sm"
      style={{
        borderColor: "var(--line)",
        color: "var(--ink-soft)",
        background: "rgba(255,255,255,0.72)",
      }}
    >
      <p>© {new Date().getFullYear()} AFL Painel • Todos os direitos reservados</p>
      <p className="mt-1">
        Desenvolvido por{" "}
        <span style={{ color: "var(--brand-strong)" }}>
          {"</>"} VZ
        </span>
      </p>
    </footer>
  );
}
