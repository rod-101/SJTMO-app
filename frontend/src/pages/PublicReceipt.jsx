import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicReceipt } from "../services/api";
import Receipt from "../components/Receipt";

export default function PublicReceipt() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getPublicReceipt(token)
      .then((res) => {
        if (!cancelled) setData({ ...res, access_token: token });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Ticket not found.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>Loading receipt…</div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h2>Receipt not found</h2>
        <p>{error || "This receipt link is invalid."}</p>
      </div>
    );
  }

  return <Receipt data={data} />;
}
