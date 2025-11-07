export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Desenvolvido por{" "}
            <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Michel Brotherhood
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © {new Date().getFullYear()} Todos os direitos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
