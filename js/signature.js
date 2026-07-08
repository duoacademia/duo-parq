(function () {
  "use strict";

  function createSignaturePad(canvas) {
    const context = canvas.getContext("2d");
    let drawing = false;
    let hasInk = false;
    let lastPoint = null;

    function resize() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      const previous = hasInk ? canvas.toDataURL("image/png") : null;

      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 2.6;
      context.strokeStyle = "#111827";

      if (previous) {
        const image = new Image();
        image.onload = function () {
          context.drawImage(image, 0, 0, rect.width, rect.height);
        };
        image.src = previous;
      }
    }

    function pointFromEvent(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    function start(event) {
      event.preventDefault();
      drawing = true;
      hasInk = true;
      lastPoint = pointFromEvent(event);
    }

    function move(event) {
      if (!drawing || !lastPoint) return;
      event.preventDefault();
      const point = pointFromEvent(event);
      context.beginPath();
      context.moveTo(lastPoint.x, lastPoint.y);
      context.lineTo(point.x, point.y);
      context.stroke();
      lastPoint = point;
    }

    function stop() {
      drawing = false;
      lastPoint = null;
    }

    function clear() {
      const rect = canvas.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);
      hasInk = false;
    }

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    canvas.addEventListener("pointerleave", stop);
    window.addEventListener("resize", resize);
    requestAnimationFrame(resize);

    return {
      clear,
      toDataURL: function () {
        return canvas.toDataURL("image/png");
      },
      hasInk: function () {
        return hasInk;
      }
    };
  }

  window.DuoSignature = { createSignaturePad };
})();
