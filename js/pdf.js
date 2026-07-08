(function () {
  "use strict";

  const termText = "Declaro estar ciente de que, caso alguma resposta tenha sido \"sim\", é recomendável a consulta médica antes de aumentar meu nível de atividade física. Assumo plena responsabilidade por minha prática de atividade física e confirmo que respondi às perguntas acima de forma verdadeira.";

  function normalizePdfText(text) {
    return String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—]/g, "-")
      .replace(/[“”]/g, "\"")
      .replace(/[‘’]/g, "'");
  }

  function formatStudentPdfName(name) {
    const safeName = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\\/:*?"<>|#{}%~&]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase() || "ALUNO";
    return `${safeName}.pdf`;
  }

  function dataUriToBase64(dataUri) {
    return dataUri.split(",")[1];
  }

  function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
    const lines = doc.splitTextToSize(normalizePdfText(text), maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  }

  function imageToDataUrl(path) {
    return fetch(path)
      .then(function (response) {
        if (!response.ok) throw new Error("Não foi possível carregar a logo.");
        return response.blob();
      })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          const reader = new FileReader();
          reader.onload = function () { resolve(reader.result); };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })
      .then(function (dataUrl) {
        return imageDataUrlToJpeg(dataUrl, 360, 360, 0.84);
      });
  }

  function imageDataUrlToJpeg(dataUrl, maxWidth, maxHeight, quality) {
    return new Promise(function (resolve, reject) {
      const image = new Image();
      image.onload = function () {
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = width;
        canvas.height = height;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = reject;
      image.src = dataUrl;
    });
  }

  function submitToDrive(payload) {
    const config = window.DuoConfig || {};
    const uploadUrl = config.driveUploadUrl;

    if (!uploadUrl) {
      return Promise.resolve({ uploaded: false });
    }

    return new Promise(function (resolve, reject) {
      let settled = false;
      const body = JSON.stringify(Object.assign({}, payload, {
        token: config.uploadToken || ""
      }));
      const timeout = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        resolve({ uploaded: true });
      }, 7000);

      fetch(uploadUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body
      }).then(function () {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve({ uploaded: true });
      }).catch(function (error) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        reject(error);
      });
    });
  }

  function drawPdf(data, logoDataUrl) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("A biblioteca de PDF ainda não carregou. Verifique a conexão e tente novamente.");
    }

    const doc = new window.jspdf.jsPDF({
      unit: "mm",
      format: "a4",
      compress: true
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    let y = 16;

    doc.addImage(logoDataUrl, "JPEG", margin, y - 2, 28, 28, undefined, "FAST");
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PAR-Q - QUESTIONARIO DE PRONTIDAO PARA ATIVIDADE FISICA", margin, y + 34);
    doc.setDrawColor(0, 109, 182);
    doc.setLineWidth(0.8);
    doc.line(margin, y + 39, pageWidth - margin, y + 39);

    y += 52;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(71, 85, 105);
    doc.text(normalizePdfText(`Nome: ${data.fullName}`), margin, y);
    y += 8;
    doc.text(`CPF: ${data.cpf}`, margin, y);
    y += 8;
    doc.text(`Data: ${data.date}`, margin, y);
    y += 8;
    doc.text(`Hora: ${data.time}`, margin, y);
    y += 14;

    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Respostas confirmadas", margin, y);
    y += 8;

    data.questions.forEach(function (question, index) {
      const answerText = data.answers[question.id] === "S" ? "Sim" : "Nao";
      const lines = doc.splitTextToSize(normalizePdfText(`${index + 1}. ${question.text}`), pageWidth - margin * 2 - 24);
      const boxHeight = Math.max(14, 8 + lines.length * 4.3);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y - 5, pageWidth - margin * 2, boxHeight, 2, 2, "FD");

      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.8);
      doc.text(lines, margin + 4, y);

      doc.setTextColor(answerText === "Sim" ? 185 : 21, answerText === "Sim" ? 28 : 128, answerText === "Sim" ? 28 : 61);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(answerText, pageWidth - margin - 16, y);
      y += boxHeight + 6;
    });

    if (y > pageHeight - 84) {
      doc.addPage();
      y = margin;
    }

    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Termo de responsabilidade", margin, y);
    y += 8;
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    y = addWrappedText(doc, termText, margin, y, pageWidth - margin * 2, 5);
    y += 8;

    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Rubrica ou assinatura", margin, y);
    y += 8;
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 42, 3, 3);
    doc.addImage(data.signatureImage, "JPEG", margin + 4, y + 4, pageWidth - margin * 2 - 8, 29, undefined, "FAST");
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Registro manuscrito do aluno", margin + 4, y + 37);

    for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
      doc.setPage(page);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("Este documento foi assinado eletronicamente antes do inicio das atividades.", margin, pageHeight - 11);
    }

    return doc;
  }

  async function generateDocument(data) {
    const images = await Promise.all([
      imageToDataUrl("logo.png"),
      imageDataUrlToJpeg(data.signatureImage, 1200, 420, 0.78)
    ]);
    const pdfData = Object.assign({}, data, { signatureImage: images[1] });
    const doc = drawPdf(pdfData, images[0]);
    const pdfFileName = formatStudentPdfName(data.fullName);
    const uploadResult = await submitToDrive({
      pdfFileName,
      pdfBase64: dataUriToBase64(doc.output("datauristring")),
      meta: {
        studentName: data.fullName,
        cpf: data.cpf,
        signedDate: data.date,
        signedTime: data.time,
        documentType: "PAR-Q"
      }
    });

    if (uploadResult.uploaded) {
      return uploadResult;
    }

    doc.save(pdfFileName);
    return { uploaded: false, downloaded: true };
  }

  window.DuoParqDocuments = { generateDocument };
})();
