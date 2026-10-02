const PT_210_SERVICE_UUIDS = [
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000fee0-0000-1000-8000-00805f9b34fb",
  "000018f0-0000-1000-8000-00805f9b34fb",
];

const PT_210_NAME_PREFIXES = ["GOJRPT", "Gojprt", "PT-210", "PT210"];

const PRINTER_CHARACTERISTIC_UUIDS = [
  "0000ff01-0000-1000-8000-00805f9b34fb",
  "0000fff1-0000-1000-8000-00805f9b34fb",
  "0000fee1-0000-1000-8000-00805f9b34fb",
];

const ESC = 0x1b;
const LF = 0x0a;

function getTextEncoder() {
  return new TextEncoder();
}

function padText(content, targetWidth = 32) {
  const text = String(content ?? "").slice(0, targetWidth);
  const padding = Math.max(0, targetWidth - text.length);
  return `${text}${" ".repeat(padding)}`;
}

function buildKeyValueLine(label, value, width = 32) {
  const labelText = String(label ?? "").slice(0, 12);
  const valueText = String(value ?? "").slice(0, width - labelText.length - 1);
  const gap = Math.max(1, width - labelText.length - valueText.length);
  return `${labelText}${" ".repeat(gap)}${valueText}`;
}

function buildColumnLine(left, right, width = 32) {
  const leftText = String(left ?? "").slice(0, Math.max(0, width - 12));
  const rightText = String(right ?? "").slice(0, 12);
  const gap = Math.max(1, width - leftText.length - rightText.length);
  return `${leftText}${" ".repeat(gap)}${rightText}`;
}

function buildEscPosData(ticketData) {
  const encoder = getTextEncoder();
  const bytes = [];

  const pushText = (text = "") => {
    const encoded = encoder.encode(String(text));
    bytes.push(...encoded);
  };

  const pushLine = (text = "") => {
    pushText(text);
    bytes.push(LF);
  };

  const pushCentered = (text = "") => {
    bytes.push(ESC, 0x61, 0x01);
    pushText(text);
    bytes.push(LF);
    bytes.push(ESC, 0x61, 0x00);
  };

  const pushBold = (text = "") => {
    bytes.push(ESC, 0x21, 0x08);
    pushText(text);
    bytes.push(LF);
    bytes.push(ESC, 0x21, 0x00);
  };

  const pushSeparator = () => pushLine("================================");

  const detailValue = (value, fallback = "—") => value ?? fallback;
  const totalFine = Number(ticketData?.total || 0);
  const violationLines = Array.isArray(ticketData?.violation_types)
    ? ticketData.violation_types
    : [];

  bytes.push(ESC, 0x40);
  bytes.push(ESC, 0x33, 0x00);
  bytes.push(ESC, 0x44, 0x00);

  pushCentered("SJTMO");
  pushCentered("San Jose Traffic Management Office");
  pushCentered("Official Violation Ticket");
  pushSeparator();
  pushBold(`Ticket #${detailValue(ticketData?.ticket_no, "—")}`);
  pushLine(`Issued: ${detailValue(ticketData?.date_issued, "—")}`);
  pushSeparator();
  pushLine(`Motorist: ${detailValue(ticketData?.motorist_name, "—")}`);
  if (ticketData?.motorist_license) {
    pushLine(`License: ${ticketData.motorist_license}`);
  }
  if (ticketData?.motorist_contact) {
    pushLine(`Contact: ${ticketData.motorist_contact}`);
  }
  pushSeparator();
  pushLine(`Vehicle: ${detailValue(ticketData?.vehicle_plate, "—")}`);
  if (ticketData?.vehicle_type) {
    pushLine(`Type: ${ticketData.vehicle_type}`);
  }
  if (ticketData?.vehicle_make || ticketData?.vehicle_model) {
    pushLine(
      `Model: ${[ticketData.vehicle_make, ticketData.vehicle_model]
        .filter(Boolean)
        .join(" ")}`,
    );
  }
  if (ticketData?.vehicle_color) {
    pushLine(`Color: ${ticketData.vehicle_color}`);
  }
  pushSeparator();
  pushLine("Violations:");
  if (violationLines.length) {
    violationLines.forEach((v) => {
      const fine = Number(v?.fine || 0);
      pushLine(
        `${String(v?.name || "Violation").slice(0, 24)} ${fine > 0 ? `₱${fine}` : ""}`,
      );
    });
  } else {
    pushLine("No violations listed");
  }
  pushSeparator();
  pushLine(
    buildKeyValueLine(
      "Total Fine",
      `₱${Number(totalFine).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      32,
    ),
  );
  if (ticketData?.notes) {
    pushLine(`Notes: ${String(ticketData.notes).slice(0, 120)}`);
  }
  pushSeparator();
  pushLine(`Enforcer: ${detailValue(ticketData?.enforcer_name, "—")}`);
  pushLine("Present this ticket when settling the violation.");
  pushLine("");
  bytes.push(ESC, 0x64, 0x02);
  bytes.push(LF, LF);
  return new Uint8Array(bytes);
}

function normalizeDeviceName(name) {
  return String(name || "").trim();
}

async function findWriteCharacteristic(service) {
  const serviceUuid = service.uuid.toLowerCase();

  for (const uuid of PRINTER_CHARACTERISTIC_UUIDS) {
    try {
      const characteristic = await service.getCharacteristic(uuid);
      if (characteristic) {
        const props = characteristic.properties || {};
        if (props.write || props.writeWithoutResponse) {
          return characteristic;
        }
      }
    } catch {
      // continue to other candidates
    }
  }

  for (const uuid of PT_210_SERVICE_UUIDS) {
    try {
      const characteristic = await service.getCharacteristic(uuid);
      if (characteristic) {
        const props = characteristic.properties || {};
        if (props.write || props.writeWithoutResponse) {
          return characteristic;
        }
      }
    } catch {
      // continue to other candidates
    }
  }

  const characteristics = await service.getCharacteristics();
  for (const characteristic of characteristics) {
    const props = characteristic.properties || {};
    if (props.write || props.writeWithoutResponse) {
      return characteristic;
    }
  }

  return null;
}

export function isAndroidBluetoothPrinterSupported() {
  return Boolean(
    typeof navigator !== "undefined" &&
    navigator.bluetooth &&
    window.isSecureContext &&
    /android/i.test(navigator.userAgent),
  );
}

export async function connectToPt210Printer() {
  if (!navigator.bluetooth) {
    throw new Error(
      "Web Bluetooth is not supported in this browser. Use Chrome on Android for direct printer output.",
    );
  }

  if (!window.isSecureContext) {
    throw new Error(
      "The app must run over HTTPS to use the PT-210 Bluetooth printer.",
    );
  }

  const isAndroid = /android/i.test(navigator.userAgent);
  if (!isAndroid) {
    throw new Error(
      "Direct PT-210 printing is currently only supported on Android Chrome.",
    );
  }

  const requestDevice = async (allowFallback = false) => {
    const filters = [
      { namePrefix: "GOJRPT" },
      { namePrefix: "Gojprt" },
      { namePrefix: "PT-210" },
      { namePrefix: "PT210" },
    ];

    const result = await navigator.bluetooth.requestDevice({
      filters,
      optionalServices: PT_210_SERVICE_UUIDS,
      acceptAllDevices: allowFallback,
    });

    return result;
  };

  let device;
  try {
    device = await requestDevice(false);
  } catch (error) {
    device = await requestDevice(true);
  }

  if (!device || !device.gatt) {
    throw new Error("The selected device could not be connected.");
  }

  const server = await device.gatt.connect();
  const characteristic = await findWriteCharacteristic(server);

  if (!characteristic) {
    device.gatt.disconnect();
    throw new Error(
      "Unable to find a writable Bluetooth characteristic on the PT-210.",
    );
  }

  return {
    device,
    characteristic,
    name: normalizeDeviceName(device.name) || "PT-210",
    disconnect: () => device.gatt.disconnect(),
  };
}

export async function printTicketToPt210(ticketData) {
  const printer = await connectToPt210Printer();
  const payload = buildEscPosData(ticketData);
  await printer.characteristic.writeValue(payload);
  return printer;
}
