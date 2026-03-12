import { useEffect, useState } from "react";

function formatName(bowler) {
  const parts = [bowler.firstName, bowler.middleInit, bowler.lastName].filter(
    (x) => x && String(x).trim().length > 0
  );
  return parts.join(" ");
}

function BowlerTable() {
  const [bowlers, setBowlers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/bowlers");
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!ignore) setBowlers(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!ignore) setError(e?.message ?? "Failed to load bowlers");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return <p>Loading bowlers…</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Team</th>
          <th>Address</th>
          <th>City</th>
          <th>State</th>
          <th>Zip</th>
          <th>Phone</th>
        </tr>
      </thead>

      <tbody>
        {bowlers.map((b) => (
          <tr key={`${b.lastName ?? ""}-${b.firstName ?? ""}-${b.phoneNumber ?? ""}`}>
            <td>{formatName(b)}</td>
            <td>{b.teamName}</td>
            <td>{b.address}</td>
            <td>{b.city}</td>
            <td>{b.state}</td>
            <td>{b.zip}</td>
            <td>{b.phoneNumber}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default BowlerTable;

