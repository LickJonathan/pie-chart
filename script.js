import { PieChartApp } from './pieChartApp.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の参照
    const dom = {
        chartContainer: document.getElementById('chart-container'),
        dataTableBody: document.getElementById('data-table-body'),
        addRowBtn: document.getElementById('add-row-btn'),
        pasteDataBtn: document.getElementById('paste-data-btn'),
        pasteArea: document.getElementById('paste-area'),
        pasteTextarea: document.getElementById('paste-textarea'),
        submitPasteBtn: document.getElementById('submit-paste-btn'),
        downloadPngBtn: document.getElementById('download-png-btn'),
        imageControlsContainer: document.getElementById('image-controls-container'),
        selectedItemNameSpan: document.getElementById('selected-item-name'),
        imageScaleInput: document.getElementById('image-scale'),
        imageOffsetXInput: document.getElementById('image-offset-x'),
        imageOffsetYInput: document.getElementById('image-offset-y'),
        noDataMessage: document.getElementById('no-data-message'),
        chartPlaceholder: document.getElementById('chart-placeholder')
    };

    // アプリのインスタンス化
    const app = new PieChartApp(dom);

    // --- イベント設定 ---
    dom.addRowBtn.onclick = () => app.addDataEntry();

    dom.pasteDataBtn.onclick = () => dom.pasteArea.classList.toggle('hidden');

    dom.submitPasteBtn.onclick = () => {
        const text = dom.pasteTextarea.value.trim();
        const lines = text.split('\n');
        lines.forEach(line => {
            const parts = line.split('\t');
            if (parts.length >= 2) app.addDataEntry(parts[0], parts[1]);
        });
        dom.pasteTextarea.value = '';
        dom.pasteArea.classList.add('hidden');
    };

    // 画像調整スライダー
    dom.imageScaleInput.oninput = (e) => app.updateImageSetting('scale', e.target.value);
    dom.imageOffsetXInput.oninput = (e) => app.updateImageSetting('offsetX', e.target.value);
    dom.imageOffsetYInput.oninput = (e) => app.updateImageSetting('offsetY', e.target.value);

    // PNGダウンロード
    dom.downloadPngBtn.onclick = () => {
        const svg = dom.chartContainer.querySelector('svg');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width * 2; canvas.height = img.height * 2;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const link = document.createElement("a");
            link.download = "chart.png"; link.href = canvas.toDataURL();
            link.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    };

    // 初期データの追加
    app.addDataEntry("サンプル", 50);
});