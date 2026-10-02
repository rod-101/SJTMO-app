import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { printTicketToPt210 } from "../services/bluetoothPrinter";
import "./Receipt.css";

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function Receipt({ data, onBack, onPrintTicket }) {
  const [printerStatus, setPrinterStatus] = useState({
    type: "idle",
    message: "",
  });

  if (!data) return null;

  const qrPayload = `${window.location.origin}/receipt/${data.access_token}`;

  const handleDirectPrint = async () => {
    if (onPrintTicket) {
      try {
        setPrinterStatus({
          type: "printing",
          message: "Connecting to the PT-210…",
        });
        await onPrintTicket();
        setPrinterStatus({
          type: "success",
          message: "Ticket sent to the PT-210.",
        });
      } catch (error) {
        setPrinterStatus({
          type: "error",
          message: error?.message || "Unable to print directly to the PT-210.",
        });
      }
      return;
    }

    try {
      setPrinterStatus({
        type: "printing",
        message: "Connecting to the PT-210…",
      });
      const printer = await printTicketToPt210(data);
      setPrinterStatus({
        type: "success",
        message: `Ticket sent to ${printer.name}.`,
      });
    } catch (error) {
      setPrinterStatus({
        type: "error",
        message: error?.message || "Unable to print directly to the PT-210.",
      });
    }
  };

  return (
    <div className="receipt-page">
      <div className="receipt-toolbar">
        {onBack && (
          <button className="btn btn-outline" onClick={onBack}>
            ← Back
          </button>
        )}
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨️ Print Receipt
        </button>
        <button className="btn btn-outline" onClick={handleDirectPrint}>
          🖨️ PT-210
        </button>
      </div>

      {printerStatus.message && (
        <div
          className={`alert ${
            printerStatus.type === "error" ? "alert-error" : "alert-success"
          } receipt-alert`}
        >
          {printerStatus.message}
        </div>
      )}

      <div className="receipt-print-area">
        <div className="receipt-card">
          <div className="receipt-header">
            <div>
              <div className="receipt-org">SJTMO</div>
              <div className="receipt-subtitle">
                San Jose Traffic Management Office
              </div>
              <div className="receipt-subtitle">Official Violation Receipt</div>
            </div>
            <QRCodeSVG value={qrPayload} size={88} />
          </div>

          <div className="receipt-ticket-no">
            Ticket <strong>#{data.ticket_no}</strong>
          </div>
          <div className="receipt-date">
            Issued: {formatDateTime(data.date_issued)}
          </div>

          <div className="receipt-section">
            <div className="receipt-section-title">Motorist</div>
            <div className="receipt-row">
              <span>Name</span>
              <strong>{data.motorist_name || "—"}</strong>
            </div>
            {data.motorist_license && (
              <div className="receipt-row">
                <span>License No.</span>
                <strong>{data.motorist_license}</strong>
              </div>
            )}
            {data.motorist_address && (
              <div className="receipt-row">
                <span>Address</span>
                <strong>{data.motorist_address}</strong>
              </div>
            )}
            {data.motorist_contact && (
              <div className="receipt-row">
                <span>Contact</span>
                <strong>{data.motorist_contact}</strong>
              </div>
            )}
          </div>

          <div className="receipt-section">
            <div className="receipt-section-title">Vehicle</div>
            <div className="receipt-row">
              <span>Plate No.</span>
              <strong>{data.vehicle_plate || "—"}</strong>
            </div>
            {data.vehicle_type && (
              <div className="receipt-row">
                <span>Type</span>
                <strong>{data.vehicle_type}</strong>
              </div>
            )}
            {(data.vehicle_make || data.vehicle_model) && (
              <div className="receipt-row">
                <span>Make / Model</span>
                <strong>
                  {[data.vehicle_make, data.vehicle_model]
                    .filter(Boolean)
                    .join(" ")}
                </strong>
              </div>
            )}
            {data.vehicle_color && (
              <div className="receipt-row">
                <span>Color</span>
                <strong>{data.vehicle_color}</strong>
              </div>
            )}
          </div>

          <div className="receipt-section">
            <div className="receipt-section-title">Violations</div>
            {(data.violation_types || []).map((v, i) => (
              <div className="receipt-row" key={i}>
                <span>{v.name}</span>
                <strong>{peso(v.fine)}</strong>
              </div>
            ))}
          </div>

          <div className="receipt-total-row">
            <span>Total Fine</span>
            <strong>{peso(data.total)}</strong>
          </div>

          {data.amount_paid > 0 && (
            <>
              <div className="receipt-row">
                <span>Amount Paid</span>
                <strong>{peso(data.amount_paid)}</strong>
              </div>
              <div className="receipt-total-row">
                <span>Balance Due</span>
                <strong>{peso(data.balance)}</strong>
              </div>
            </>
          )}

          {data.notes && (
            <div className="receipt-notes">Notes: {data.notes}</div>
          )}

          <div className="receipt-footer">
            <div>Issued by: {data.enforcer_name || "—"}</div>
            <div className="receipt-footer-note">
              Present this receipt when settling your violation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
