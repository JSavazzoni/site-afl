export default function SiteFooter() {
  return (
    <footer
      className="mt-auto shrink-0 border-t px-6 py-4 text-center"
      style={{
        borderColor: "var(--line)",
        color: "var(--ink-faint)",
        background: "transparent",
      }}
    >
      <p className="text-[11px] leading-5">
        © {new Date().getFullYear()} AFL Painel • Todos os direitos reservados
      </p>
      <p className="mt-0.5 text-[11px] leading-5">
        Desenvolvido por{" "}
        <span className="font-medium" style={{ color: "var(--brand-strong)" }}>
          {"</>"} Vz
        </span>
      </p>
    </footer>
  );
}
