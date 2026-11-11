export const GlassCard = ({ children, className = '', ...props }) => (
  <div className={`bg-glass shadow-theme rounded-2xl transition-all duration-400 hover:-translate-y-1 hover:shadow-lg ${className}`} {...props}>
    {children}
  </div>
);

export const SolidCard = ({ children, className = '', ...props }) => (
  <div className={`bg-card border border-theme rounded-2xl shadow-theme transition-all duration-400 hover:-translate-y-1 hover:shadow-lg ${className}`} {...props}>
    {children}
  </div>
);
