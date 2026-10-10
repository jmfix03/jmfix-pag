/* Shared JM FIX PDF layout primitives. Presentation-only: no Firestore or payment mutations. */
window.JmFixPdf = (() => {
  const PAGE = { left: 15, right: 195, top: 43, bottom: 280, width: 180 };

  const money = (value) => {
    if (value === null || value === undefined || value === "") return "Pendiente de aprobación";
    return (Number(value) || 0).toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    });
  };

  const textValue = (value, fallback = "—") =>
    value === null || value === undefined || value === "" ? fallback : String(value);

  const cleanMarkdown = (value) =>
    String(value ?? "").replace(/\r\n?/g, "\n");

  function create(doc, options = {}) {
    const {
      logo,
      order = {},
      customer = {},
      device = {},
      diagnosis = "",
      warranty = "",
      documentType = "Comprobante de reparación",
      includeCustomer = true,
      includeFinancial = false,
      financial = {},
    } = options;

    let y = PAGE.top;
    let page = 1;

    const drawHeader = (continuation = false) => {
      if (!continuation) {
        doc.setFillColor(0, 191, 99);
        doc.rect(0, 0, 210, 32, "F");
        doc.setFillColor(74, 161, 37);
        doc.triangle(95, 0, 210, 0, 210, 32, "F");
        try {
          if (logo) doc.addImage(logo, "JPEG", 14, 5, 22, 22);
        } catch (_) {}
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("JM FIX", 42, 17);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(245, 255, 247);
        doc.text(documentType, 42, 24);
        doc.setTextColor(20, 23, 28);
        return;
      }

      doc.setFillColor(0, 145, 80);
      doc.rect(0, 0, 210, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("JM FIX", PAGE.left, 8);
      doc.setFont("helvetica", "normal");
      doc.text(documentType, 42, 8);
      doc.text("Orden N.º " + textValue(order.numero), 157, 8);
      doc.setTextColor(20, 23, 28);
    };

    const ensure = (height = 10) => {
      if (y + height <= PAGE.bottom) return;
      doc.addPage();
      page += 1;
      drawHeader(true);
      y = 22;
    };

    const section = (title) => {
      ensure(18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 125, 71);
      doc.text(title, PAGE.left, y);
      doc.setDrawColor(215, 230, 220);
      doc.line(PAGE.left, y + 2, PAGE.right, y + 2);
      doc.setTextColor(20, 23, 28);
      y += 10;
    };

    const divider = () => {
      ensure(8);
      doc.setDrawColor(220);
      doc.line(PAGE.left, y, PAGE.right, y);
      y += 7;
    };

    const pair = (leftLabel, leftValue, rightLabel, rightValue) => {
      const left = textValue(leftValue);
      const right = textValue(rightValue);
      ensure(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(leftLabel, PAGE.left, y);
      if (rightLabel) doc.text(rightLabel, 108, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const leftLines = doc.splitTextToSize(left, 78);
      const rightLines = rightLabel ? doc.splitTextToSize(right, 78) : [];
      const lines = Math.max(leftLines.length, rightLines.length);
      ensure(lines * 4.5 + 7);
      doc.text(leftLines, PAGE.left, y + 4);
      if (rightLabel) doc.text(rightLines, 108, y + 4);
      y += lines * 4.5 + 7;
    };

    const richLine = (value, x, width, size = 9, indent = 0) => {
      const pieces = [];
      String(value ?? "").split(/(\*\*[^*]+\*\*)/g).filter(Boolean).forEach((piece) => {
        const bold = piece.startsWith("**") && piece.endsWith("**");
        const raw = bold ? piece.slice(2, -2) : piece;
        raw.split(/\s+/).filter(Boolean).forEach((word) => pieces.push({ word, bold }));
      });
      const lines = [];
      let current = [];
      let currentWidth = indent;
      pieces.forEach((piece) => {
        doc.setFont("helvetica", piece.bold ? "bold" : "normal");
        doc.setFontSize(size);
        const token = (current.length ? " " : "") + piece.word;
        const tokenWidth = doc.getTextWidth(token);
        if (current.length && currentWidth + tokenWidth > width) {
          lines.push(current);
          current = [];
          currentWidth = indent;
        }
        current.push(piece);
        currentWidth += current.length === 1 ? doc.getTextWidth(piece.word) : tokenWidth;
      });
      if (current.length) lines.push(current);
      const lineHeight = size <= 8 ? 4 : 5;
      lines.forEach((line) => {
        ensure(lineHeight + 2);
        let cursor = x + (line === lines[0] ? indent : 0);
        line.forEach((piece, index) => {
          doc.setFont("helvetica", piece.bold ? "bold" : "normal");
          doc.setFontSize(size);
          const prefix = index === 0 ? "" : " ";
          doc.text(prefix + piece.word, cursor, y);
          cursor += doc.getTextWidth(prefix + piece.word);
        });
        y += lineHeight;
      });
      return lines.length * lineHeight;
    };

    const markdown = (value) => {
      const lines = cleanMarkdown(value).split("\n");
      if (!lines.some((line) => line.trim())) {
        richLine("Sin diagnóstico cargado.", PAGE.left, PAGE.width, 9);
        return;
      }
      lines.forEach((raw) => {
        const line = raw.trim();
        if (!line) {
          y += 2;
          return;
        }
        const heading = line.match(/^#{1,6}\s+(.+)$/);
        if (heading) {
          ensure(16);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(0, 125, 71);
          doc.text(heading[1].replace(/\*\*/g, ""), PAGE.left, y);
          doc.setTextColor(20, 23, 28);
          y += 7;
          return;
        }
        const bullet = line.match(/^(?:[-*+•]|\d+[.)])\s+(.+)$/);
        if (bullet) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.text("•", PAGE.left, y);
          richLine(bullet[1], PAGE.left + 5, PAGE.width - 5, 9);
          return;
        }
        richLine(line, PAGE.left, PAGE.width, 9);
        y += 1;
      });
    };

    const warrantyBlock = () => {
      section("GARANTÍA");
      richLine(textValue(warranty, "60 días"), PAGE.left, PAGE.width, 9);
      y += 2;
      section("CONDICIONES DE GARANTÍA");
      [
        "Todas las reparaciones cuentan con 60 días de garantía, salvo indicación expresa en contrario.",
        "La garantía cubre la reparación realizada y la falla asociada al trabajo efectuado.",
        "No cubre nuevas fallas, golpes, líquidos, uso posterior o daños distintos a los reparados.",
        "La garantía queda sujeta a la evaluación del equipo para verificar su relación con la reparación.",
      ].forEach((condition) => {
        ensure(9);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("•", PAGE.left, y);
        richLine(condition, PAGE.left + 5, PAGE.width - 5, 8);
        y += 1;
      });
    };

    const financialBlock = () => {
      section("RESUMEN ECONÓMICO");
      const approved = financial.total !== null && financial.total !== undefined && financial.total !== "";
      const paid = Number(financial.paid) || 0;
      const balance = (Number(financial.total) || 0) - paid;
      pair("Estado", approved ? "Importe aprobado" : "Pendiente de aprobación", "Total aprobado", approved ? money(financial.total) : "Pendiente de aprobación");
      pair("Total abonado", paid > 0 ? money(paid) : "Sin pagos registrados", "Saldo pendiente", approved ? (balance > 0 ? money(balance) : "Sin saldo pendiente") : "Pendiente de aprobación");
    };

    drawHeader(false);
    section("ORDEN Y CLIENTE");
    pair("Orden N.º", order.numero, "Fecha", order.date);
    pair("Estado", order.status, includeCustomer ? "Cliente" : "", includeCustomer ? [customer.nombre, customer.apellido].filter(Boolean).join(" ") : "");
    if (includeCustomer) pair("DNI", customer.dni, "Teléfono", customer.telefono);

    divider();
    section("DATOS DEL EQUIPO");
    pair("Tipo de equipo", device.type, "Modelo", device.model);
    pair("Color", device.color, "Accesorios", device.accessories);

    divider();
    section("DIAGNÓSTICO Y TRABAJO A REALIZAR");
    markdown(diagnosis);

    if (includeFinancial) financialBlock();
    warrantyBlock();

    ensure(16);
    doc.setDrawColor(200);
    doc.line(PAGE.left, y, PAGE.right, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Página " + page, PAGE.left, y);
    doc.text("Contactanos por WhatsApp: +54 9 11 2337-6532", 55, y);
    return doc;
  };

  return { create, money };
})();