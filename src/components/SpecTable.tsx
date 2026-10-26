export type SpecRow = { name: string; value: string };

type SpecTableProps = {
  title: string;
  rows: SpecRow[];
};

export default function SpecTable({ title, rows }: SpecTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="specs-block">
      <h3 className="specs-block__title">{title}</h3>
      <table className="specs-table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
