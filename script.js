// DOMの読み込みが完了したらスクリプトを実行
document.addEventListener('DOMContentLoaded', () => {
    
    // --- グローバル変数と定数 ---
    let dataEntries = []; 
    let nextEntryId = 0;
    let selectedEntryId = null; 
    let draggingElement = null; 
    let dragOffsetX, dragOffsetY; 
    let svgElement; 
    let dragSourceIndex = null;

    // --- DOM要素の取得 ---
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
        scaleValueSpan: document.getElementById('scale-value'),
        imageOffsetXInput: document.getElementById('image-offset-x'),
        offsetXValueSpan: document.getElementById('offset-x-value'),
        imageOffsetYInput: document.getElementById('image-offset-y'),
        offsetYValueSpan: document.getElementById('offset-y-value'),
        noDataMessage: document.getElementById('no-data-message'),
        chartPlaceholder: document.getElementById('chart-placeholder'),
        customMessageDiv: document.getElementById('custom-message')
    };
    
    // --- ユーティリティ関数 ---

    /**
     * 画面上部にメッセージを表示する
     * @param {string} message - 表示するメッセージ
     * @param {string} type - メッセージの種類 ('info', 'success', 'error')
     * @param {number} duration - 表示時間 (ミリ秒)
     */
    function showMessage(message, type = "info", duration = 3000) {
        dom.customMessageDiv.textContent = message;
        dom.customMessageDiv.classList.remove('bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-gray-700');
        if (type === "error") dom.customMessageDiv.classList.add('bg-red-500');
        else if (type === "success") dom.customMessageDiv.classList.add('bg-green-500');
        else dom.customMessageDiv.classList.add('bg-gray-700');
        dom.customMessageDiv.classList.add('show');
        setTimeout(() => { dom.customMessageDiv.classList.remove('show'); }, duration);
    }
    
    /**
     * パイ（扇形）のSVGパスデータを生成する
     * @param {number} cx - 中心X座標
     * @param {number} cy - 中心Y座標
     * @param {number} r - 半径
     * @param {number} startAngle - 開始角度 (ラジアン)
     * @param {number} endAngle - 終了角度 (ラジアン)
     * @returns {string} SVGパスデータ
     */
    function getArcPath(cx, cy, r, startAngle, endAngle) {
        const startX = cx + r * Math.cos(startAngle);
        const startY = cy + r * Math.sin(startAngle);
        const endX = cx + r * Math.cos(endAngle);
        const endY = cy + r * Math.sin(endAngle);
        const largeArcFlag = (endAngle - startAngle) <= Math.PI ? "0" : "1";
        // 稀なケースのエッジケース対応
        if (Math.abs(startX - endX) < 0.01 && Math.abs(startY - endY) < 0.01 && (endAngle - startAngle) > 0) {
             if ((endAngle - startAngle) > Math.PI * 1.99) { 
                 return `M ${cx},${cy} L ${startX},${startY} A ${r},${r} 0 ${largeArcFlag} 1 ${endX - 0.01},${endY} Z`;
             }
        }
        return `M ${cx},${cy} L ${startX},${startY} A ${r},${r} 0 ${largeArcFlag} 1 ${endX},${endY} Z`;
    }

    // --- データ管理関数 ---

    /**
     * 新しいデータ行を追加する
     */
    function addDataEntry(name = "", value = 0, imageSrc = null, imageSettings = null, leaderLine = null) {
        const id = nextEntryId++;
        const entry = {
            id,
            name: name || `項目 ${id + 1}`,
            value: Number(value) || 0,
            imageSrc,
            imageSettings: imageSettings || { scale: 1, offsetX: 0, offsetY: 0 },
            leaderLine: leaderLine || { x1: 0, y1: 0, x2: 0, y2: 0, labelX: 0, labelY: 0, active: true }
        };
        dataEntries.push(entry);
        renderTable();
        drawPieChart();
    }

    /**
     * データテーブルの表示を更新する
     */
    function renderTable() {
        dom.dataTableBody.innerHTML = '';
        const hasData = dataEntries.length > 0;
        dom.noDataMessage.classList.toggle('hidden', hasData);

        if (!hasData) {
            dom.downloadPngBtn.disabled = true;
            if (dom.chartPlaceholder) dom.chartPlaceholder.classList.remove('hidden');
            if (svgElement) svgElement.remove(); 
            svgElement = null;
        } else {
            if (dom.chartPlaceholder) dom.chartPlaceholder.classList.add('hidden');
        }

        dataEntries.forEach(createRowInTable);
    }

    /**
     * テーブル内に1行分の要素を作成して追加する
     * @param {object} entry - データエントリオブジェクト
     */
    function createRowInTable(entry) {
        const row = dom.dataTableBody.insertRow();
        row.className = 'bg-white border-b hover:bg-gray-50';
        row.dataset.id = entry.id;

        // 各セルの作成
        createNameCell(row, entry);
        createValueCell(row, entry);
        createImageCell(row, entry);
        createActionCell(row, entry);
    }

    function createNameCell(row, entry) {
        const cell = row.insertCell(); cell.className = 'px-4 py-2';
        const input = document.createElement('input');
        input.type = 'text'; input.value = entry.name;
        input.className = 'w-full p-1 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-400';
        input.onchange = (e) => {
            entry.name = e.target.value; drawPieChart();
            if (selectedEntryId === entry.id) dom.selectedItemNameSpan.textContent = entry.name;
        };
        cell.appendChild(input);
    }

    function createValueCell(row, entry) {
        const cell = row.insertCell(); cell.className = 'px-4 py-2';
        const input = document.createElement('input');
        input.type = 'number'; input.value = entry.value; input.min = "0";
        input.className = 'w-full p-1 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-400';
        input.onchange = (e) => {
            entry.value = Math.max(0, parseFloat(e.target.value) || 0); drawPieChart();
        };
        cell.appendChild(input);
    }

    function createImageCell(row, entry) {
        const cell = row.insertCell(); cell.className = 'px-4 py-2';
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.className = 'text-sm w-full max-w-[150px] sm:max-w-full';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    entry.imageSrc = event.target.result;
                    entry.imageSettings = { scale: 1, offsetX: 0, offsetY: 0 };
                    if (selectedEntryId === entry.id) updateImageControlsUI(entry);
                    renderTable(); drawPieChart();
                };
                reader.readAsDataURL(file);
            }
        };
        cell.appendChild(input);
        if (entry.imageSrc) {
            const imgPreview = document.createElement('img');
            imgPreview.src = entry.imageSrc;
            imgPreview.className = 'h-10 w-auto mt-1 rounded object-contain';
            cell.appendChild(imgPreview);
        }
    }

    function createActionCell(row, entry) {
        const cell = row.insertCell(); cell.className = 'px-4 py-2 text-center';
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500 hover:text-red-700" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>';
        deleteBtn.title = "この行を削除";
        deleteBtn.onclick = () => {
            dataEntries = dataEntries.filter(item => item.id !== entry.id);
            if (selectedEntryId === entry.id) {
                selectedEntryId = null; dom.imageControlsContainer.classList.add('hidden');
            }
            renderTable(); drawPieChart();
        };
        cell.appendChild(deleteBtn);
    }
    
    // --- 画像調整UI関数 ---

    /**
     * 選択されたパイの画像調整UIを更新する
     * @param {object} entry - 選択されたデータエントリ
     */
    function updateImageControlsUI(entry) {
        dom.selectedItemNameSpan.textContent = entry.name;
        dom.imageScaleInput.value = entry.imageSettings.scale; 
        dom.scaleValueSpan.textContent = entry.imageSettings.scale;
        dom.imageOffsetXInput.value = entry.imageSettings.offsetX;
        dom.offsetXValueSpan.textContent = entry.imageSettings.offsetX;
        dom.imageOffsetYInput.value = entry.imageSettings.offsetY; 
        dom.offsetYValueSpan.textContent = entry.imageSettings.offsetY;
        dom.imageControlsContainer.classList.remove('hidden');
    }

    /**
     * 画像調整コントロールのイベントリスナーを設定する
     */
    function setupImageControlListeners() {
        dom.imageScaleInput.oninput = (e) => handleImageControlChange('scale', parseFloat(e.target.value));
        dom.imageOffsetXInput.oninput = (e) => handleImageControlChange('offsetX', parseInt(e.target.value));
        dom.imageOffsetYInput.oninput = (e) => handleImageControlChange('offsetY', parseInt(e.target.value));
    }
    
    /**
     * 画像調整コントロールの変更を処理する
     * @param {string} property - 変更されたプロパティ名 ('scale', 'offsetX', 'offsetY')
     * @param {number} value - 新しい値
     */
    function handleImageControlChange(property, value) {
        if (selectedEntryId === null) return;
        const entry = dataEntries.find(item => item.id === selectedEntryId);
        if (entry) {
            entry.imageSettings[property] = value;
            // 対応するspanの値を更新
            const spanId = `${property.toLowerCase().replace('offset', '')}-value`;
            const span = document.getElementById(spanId);
            if(span) span.textContent = value;

            drawPieChart();
        }
    }


    // --- 描画関数 ---
    
    /**
     * SVGのViewBoxを動的に更新し、全要素が収まるようにする
     * @param {number} padding - 表示領域の余白
     */
    function updateViewBox(padding = 20) {
        if (!svgElement) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const elements = svgElement.querySelectorAll('path, text, polyline');
        if (elements.length === 0) return;

        elements.forEach(el => {
            const bbox = el.getBBox();
            if (bbox.width === 0 && bbox.height === 0) return; // 描画されていない要素は無視
            minX = Math.min(minX, bbox.x);
            minY = Math.min(minY, bbox.y);
            maxX = Math.max(maxX, bbox.x + bbox.width);
            maxY = Math.max(maxY, bbox.y + bbox.height);
        });

        if (minX === Infinity) return; // 有効な要素がない場合
        const boxWidth = maxX - minX;
        const boxHeight = maxY - minY;
        const newViewBox = [ minX - padding, minY - padding, boxWidth + padding * 2, boxHeight + padding * 2 ].join(' ');
        svgElement.setAttribute('viewBox', newViewBox);
    }
    
    /**
     * メインの円グラフ描画処理
     */
    function drawPieChart() {
        if (dom.chartPlaceholder) dom.chartPlaceholder.classList.add('hidden');
        if (svgElement) { svgElement.remove(); svgElement = null; }

        const validEntries = dataEntries.filter(entry => entry.value > 0);
        if (validEntries.length === 0) {
            dom.chartContainer.innerHTML = `<p id="chart-placeholder" class="text-gray-400 p-4 text-center">${dataEntries.length === 0 ? 'データ入力後にグラフが表示されます' : '有効なデータ（値が0より大きい）がありません'}</p>`;
            dom.chartPlaceholder = document.getElementById('chart-placeholder'); // 要素を再取得
            dom.downloadPngBtn.disabled = true; 
            dom.imageControlsContainer.classList.add('hidden'); 
            selectedEntryId = null; 
            return;
        }
        dom.downloadPngBtn.disabled = false;

        const totalValue = validEntries.reduce((sum, entry) => sum + entry.value, 0);

        const containerWidth = dom.chartContainer.clientWidth; 
        const svgWidth = containerWidth; const svgHeight = containerWidth; 
        const radius = Math.min(svgWidth, svgHeight) * 0.35; 
        const labelRadius = radius * 1.45; 
        const leaderLineLabelOffset = 20; 
        const fontSize = 12; 
        const centerX = svgWidth / 2; const centerY = svgHeight / 2;
        const colors = ['#4CAF50', '#2196F3', '#FFC107', '#E91E63', '#9C27B0', '#00BCD4', '#FF9800', '#795548', '#607D8B', '#FF5722'];
        
        svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttribute("width", "100%"); 
        svgElement.setAttribute("height", "100%");
        svgElement.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`); 
        dom.chartContainer.appendChild(svgElement); 

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        svgElement.appendChild(defs);

        let currentAngle = -Math.PI / 2;
        const pieSlices = [];
        const labelsAndLines = [];

        validEntries.forEach((entry, index) => {
            const sliceAngle = (entry.value / totalValue) * 2 * Math.PI;
            const endAngle = currentAngle + sliceAngle;
            const midAngle = currentAngle + sliceAngle / 2;

            // --- パイ要素の作成 ---
            const clipPathId = `clip-path-${entry.id}`;
            const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
            clipPath.setAttribute("id", clipPathId);
            const clipPathShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
            clipPathShape.setAttribute("d", getArcPath(centerX, centerY, radius, currentAngle, endAngle));
            clipPath.appendChild(clipPathShape);
            defs.appendChild(clipPath);

            let fillStyle = colors[index % colors.length];
            if (entry.imageSrc) {
                const patternId = `pattern-${entry.id}`;
                fillStyle = `url(#${patternId})`; 
                const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
                pattern.setAttribute("id", patternId); pattern.setAttribute("patternUnits", "userSpaceOnUse"); 
                pattern.setAttribute("width", svgWidth); pattern.setAttribute("height", svgHeight);
                const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
                image.setAttributeNS("http://www.w3.org/1999/xlink", "href", entry.imageSrc);
                
                const centroidRadius = (2 / 3) * radius;
                const imageCenterX = centerX + centroidRadius * Math.cos(midAngle);
                const imageCenterY = centerY + centroidRadius * Math.sin(midAngle);
                const scaledImgSize = radius * 2 * entry.imageSettings.scale;

                image.setAttribute("x", imageCenterX - scaledImgSize / 2 + entry.imageSettings.offsetX);
                image.setAttribute("y", imageCenterY - scaledImgSize / 2 + entry.imageSettings.offsetY);
                image.setAttribute("width", scaledImgSize); image.setAttribute("height", scaledImgSize);
                image.setAttribute("preserveAspectRatio", "xMidYMid meet"); // 画像が切れないように 'meet' を使用
                pattern.appendChild(image); defs.appendChild(pattern);
            }

            const pieSlice = document.createElementNS("http://www.w3.org/2000/svg", "path");
            pieSlice.setAttribute("d", getArcPath(centerX, centerY, radius, currentAngle, endAngle));
            pieSlice.setAttribute("fill", fillStyle);
            if (entry.imageSrc) pieSlice.setAttribute("clip-path", `url(#${clipPathId})`);
            pieSlice.setAttribute("stroke", "#fff"); pieSlice.setAttribute("stroke-width", "2");
            pieSlice.dataset.id = entry.id; 
            pieSlice.classList.add("cursor-pointer", "hover:opacity-80", "transition-opacity");
            pieSlice.onclick = () => { selectedEntryId = entry.id; updateImageControlsUI(entry); };
            pieSlices.push(pieSlice);

            // --- ラベルと線の作成 ---
            if (entry.leaderLine.active) {
                // 位置情報の計算
                entry.leaderLine.labelX = centerX + labelRadius * Math.cos(midAngle);
                entry.leaderLine.labelY = centerY + labelRadius * Math.sin(midAngle);
                entry.leaderLine.x2 = centerX + radius * Math.cos(midAngle);
                entry.leaderLine.y2 = centerY + radius * Math.sin(midAngle);
                const vecLabelToAnchorX = entry.leaderLine.x2 - entry.leaderLine.labelX;
                const vecLabelToAnchorY = entry.leaderLine.y2 - entry.leaderLine.labelY;
                const distLabelToAnchor = Math.sqrt(vecLabelToAnchorX * vecLabelToAnchorX + vecLabelToAnchorY * vecLabelToAnchorY);
                if (distLabelToAnchor > leaderLineLabelOffset) {
                    entry.leaderLine.x1 = entry.leaderLine.labelX + vecLabelToAnchorX * (leaderLineLabelOffset / distLabelToAnchor);
                    entry.leaderLine.y1 = entry.leaderLine.labelY + vecLabelToAnchorY * (leaderLineLabelOffset / distLabelToAnchor);
                } else {
                    entry.leaderLine.x1 = entry.leaderLine.x2;
                    entry.leaderLine.y1 = entry.leaderLine.y2;
                }

                // ラベル要素
                const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
                label.setAttribute("x", entry.leaderLine.labelX);
                label.setAttribute("y", entry.leaderLine.labelY);
                label.setAttribute("text-anchor", "middle"); 
                label.setAttribute("font-size", `${fontSize}px`);
                label.setAttribute("fill", "#333");
                label.classList.add("draggable", "leader-line-label");
                label.dataset.id = entry.id; label.dataset.type = "label"; 
                
                const tspan1 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                tspan1.textContent = `${entry.name} (${entry.value.toLocaleString()})`;
                tspan1.setAttribute("x", entry.leaderLine.labelX);
                tspan1.setAttribute("dy", `-${fontSize * 0.2}px`); 
                
                const tspan2 = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                const percentage = (entry.value / totalValue * 100).toFixed(1);
                tspan2.textContent = `${percentage}%`;
                tspan2.setAttribute("x", entry.leaderLine.labelX);
                tspan2.setAttribute("dy", `${fontSize * 1.2}px`); 
                label.appendChild(tspan1); label.appendChild(tspan2);
                
                // 線要素
                const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
                line.setAttribute("points", `${entry.leaderLine.x1},${entry.leaderLine.y1} ${entry.leaderLine.x2},${entry.leaderLine.y2}`);
                line.setAttribute("stroke", "#333"); line.setAttribute("stroke-width", "1.5");
                line.setAttribute("fill", "none"); line.dataset.lineFor = entry.id; 

                labelsAndLines.push({label, line});
            }
            currentAngle = endAngle; 
        });

        // 描画順序を考慮してSVGに追加
        pieSlices.forEach(el => svgElement.appendChild(el));
        labelsAndLines.forEach(group => {
            svgElement.appendChild(group.label);
            svgElement.appendChild(group.line);
        });

        updateViewBox();
    }

    // --- ラベルのドラッグ処理関数 ---
    
    function startDrag(evt) {
        if (evt.target.closest('.leader-line-label') && svgElement) {
            draggingElement = evt.target.closest('.leader-line-label'); 
            draggingElement.classList.add('dragging');
            const CTM = svgElement.getScreenCTM(); if (!CTM) return; 
            const inverseCTM = CTM.inverse();
            const pt = svgElement.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
            const svgP = pt.matrixTransform(inverseCTM);
            dragOffsetX = svgP.x - parseFloat(draggingElement.getAttribute("x"));
            dragOffsetY = svgP.y - parseFloat(draggingElement.getAttribute("y"));
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', endDrag);
            evt.preventDefault(); 
        }
    }

    function drag(evt) {
        if (!draggingElement) return;
        const CTM = svgElement.getScreenCTM(); if (!CTM) return;
        const inverseCTM = CTM.inverse();
        const pt = svgElement.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
        const svgP = pt.matrixTransform(inverseCTM);

        const entryId = parseInt(draggingElement.dataset.id);
        const entry = dataEntries.find(e => e.id === entryId);
        if (!entry || !entry.leaderLine) return;

        const newX = svgP.x - dragOffsetX;
        const newY = svgP.y - dragOffsetY;

        draggingElement.setAttribute("x", newX);
        draggingElement.setAttribute("y", newY);
        draggingElement.querySelectorAll('tspan').forEach(tspan => tspan.setAttribute("x", newX));
        entry.leaderLine.labelX = newX;
        entry.leaderLine.labelY = newY;
        
        updateLeaderLineOnLabelDrag(entry);
        updateViewBox();
    }
    
    function updateLeaderLineOnLabelDrag(entry) {
        const leaderLineLabelOffset = 20; 
        const vecLabelToAnchorX = entry.leaderLine.x2 - entry.leaderLine.labelX;
        const vecLabelToAnchorY = entry.leaderLine.y2 - entry.leaderLine.labelY;
        const distLabelToAnchor = Math.sqrt(vecLabelToAnchorX * vecLabelToAnchorX + vecLabelToAnchorY * vecLabelToAnchorY);

        if (distLabelToAnchor > leaderLineLabelOffset) {
            entry.leaderLine.x1 = entry.leaderLine.labelX + vecLabelToAnchorX * (leaderLineLabelOffset / distLabelToAnchor);
            entry.leaderLine.y1 = entry.leaderLine.labelY + vecLabelToAnchorY * (leaderLineLabelOffset / distLabelToAnchor);
        } else { 
            entry.leaderLine.x1 = entry.leaderLine.x2; 
            entry.leaderLine.y1 = entry.leaderLine.y2;
        }
        
        const lineElement = svgElement.querySelector(`polyline[data-line-for='${entry.id}']`);
        if (lineElement) {
             lineElement.setAttribute("points", `${entry.leaderLine.x1},${entry.leaderLine.y1} ${entry.leaderLine.x2},${entry.leaderLine.y2}`);
        }
    }

    function endDrag() {
        if (draggingElement) {
            draggingElement.classList.remove('dragging');
            draggingElement = null;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', endDrag);
        }
    }

    // --- データの並び替え処理関数 ---
    function handleDragStart(e) {
        const row = e.target.closest('tr');
        dragSourceIndex = [...dom.dataTableBody.children].indexOf(row);
        row.classList.add('dragging-row');
        e.dataTransfer.effectAllowed = 'move';
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        const row = e.target.closest('tr');
        if (row) row.classList.add('drag-over');
        return false;
    }
    
    function handleDragLeave(e) {
        const row = e.target.closest('tr');
        if (row) row.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        const row = e.target.closest('tr');
        if (!row) return;
        
        row.classList.remove('drag-over');
        const targetIndex = [...dom.dataTableBody.children].indexOf(row);
    
        if (dragSourceIndex !== targetIndex) {
            // データの入れ替え
            const [movedItem] = dataEntries.splice(dragSourceIndex, 1);
            dataEntries.splice(targetIndex, 0, movedItem);
            
            // 再描画
            renderTable();
            drawPieChart();
        }
    }
    
    function handleDragEnd(e) {
        const row = e.target.closest('tr');
        if (row) row.classList.remove('dragging-row');
        // 全ての行から drag-over を除去（念のため）
        [...dom.dataTableBody.children].forEach(r => r.classList.remove('drag-over'));
    }
    
    // --- createRowInTable 関数を更新 ---
    function createRowInTable(entry) {
        const row = dom.dataTableBody.insertRow();
        row.className = 'bg-white border-b hover:bg-gray-50 transition-all';
        row.dataset.id = entry.id;
        
        // ドラッグ＆ドロップ設定
        row.draggable = true;
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('dragleave', handleDragLeave);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragend', handleDragEnd);
    
        // 1. ハンドルセルの作成
        const handleCell = row.insertCell();
        handleCell.className = 'px-2 py-2 text-center';
        const handleIcon = document.createElement('div');
        handleIcon.className = 'drag-handle';
        handleIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>`;
        handleCell.appendChild(handleIcon);
    
        // 2. 既存のセル作成を呼び出し
        createNameCell(row, entry);
        createValueCell(row, entry);
        createImageCell(row, entry);
        createActionCell(row, entry);
    }

    // --- イベントリスナーの設定 ---
    
    dom.addRowBtn.onclick = () => addDataEntry();
    
    dom.pasteDataBtn.onclick = () => {
        dom.pasteArea.classList.toggle('hidden');
        if (!dom.pasteArea.classList.contains('hidden')) dom.pasteTextarea.focus();
    };
    
    dom.submitPasteBtn.onclick = () => {
        const text = dom.pasteTextarea.value.trim();
        if (!text) { showMessage("貼り付けるデータがありません。", "error"); return; }
        const lines = text.split('\n'); let addedCount = 0;
        lines.forEach(line => {
            const parts = line.split('\t');
            if (parts.length >= 2) {
                const name = parts[0].trim(); const value = parseFloat(parts[1].trim());
                if (name && !isNaN(value) && value >= 0) { addDataEntry(name, value); addedCount++; }
            }
        });
        if (addedCount > 0) showMessage(`${addedCount}件のデータを貼り付けました。`, "success");
        else showMessage("有効なデータ形式が見つかりませんでした。\n各行は「項目名 (タブ) 値」の形式で入力してください。", "error", 5000);
        dom.pasteTextarea.value = ''; dom.pasteArea.classList.add('hidden');
    };

    dom.downloadPngBtn.onclick = () => {
        if (!svgElement) { showMessage("グラフが描画されていません。", "error"); return; }
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement("canvas");
        const viewBox = svgElement.getAttribute('viewBox').split(' ').map(parseFloat);
        const svgWidthInViewBox = viewBox[2];
        const svgHeightInViewBox = viewBox[3];
        const scaleFactor = 2;
        canvas.width = svgWidthInViewBox * scaleFactor;
        canvas.height = svgHeightInViewBox * scaleFactor;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            // 背景を透過させるため、塗りつぶし処理は行わない
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height); 
            const pngUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = "interactive-pie-chart-transparent.png"; link.href = pngUrl;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            showMessage("透過PNG画像をダウンロードしました。", "success");
        };
        img.onerror = (e) => { console.error("SVGから画像への変換エラー:", e); showMessage("PNG画像の生成に失敗しました。", "error"); };
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    };
    
    dom.chartContainer.addEventListener('mousedown', startDrag);

    window.onresize = () => {
        // リサイズ時の再描画処理（タイマーで頻発を防ぐ）
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            if (svgElement && dataEntries.filter(e => e.value > 0).length > 0) { drawPieChart(); }
        }, 250); 
    };

    // --- 初期化処理 ---
    setupImageControlListeners();
    renderTable(); 
});
