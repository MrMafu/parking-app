type PageHeaderProps = {
  title: string;
  action?: React.ReactNode;
};

export default function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-lg font-semibold text-dark">{title}</h1>
      {action}
    </div>
  );
}
