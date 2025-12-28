/**
 * PieChartApp クラス
 * データ管理、SVG描画、ドラッグ＆ドロップによる並び替えを担当
 */
export class PieChartApp {
    constructor(dom) {
        this.dom = dom;
        this.dataEntries = [];
        this.nextEntryId = 0;
        this.selectedEntryId = null;
        this.svgElement = null;
        
        // ドラッグ関連の状態
        this.draggingElement = null;
        this.dragTargetData = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        this.colors = ['#4CAF50', '#2196F3', '#FFC107', '#E91E63', '#9C27B0', '#00BCD4', '#FF9800', '#795548', '#607D8B', '#FF5722'];
        
        // グローバルなマウスイベントのバインド（thisを固定）
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
    }

    // --- データ管理 ---
    addDataEntry(name = "", value = 0, imageSrc = null) {
        const id = this.nextEntryId++;
        this.dataEntries.push({
            id,
            name: name || `項目 ${id + 1}`,
            value: Number(value) || 0,
            imageSrc,
            imageSettings: { scale: 1, offsetX: 0, offsetY: 0 },
            // ラベルの座標。初期値はnullにし、描画時に計算
            labelPos: { x: 0, y: 0, isCustom: false } 
        });
        this.refresh();
    }

    refresh() {
        this.renderTable();
        this.drawPieChart();
    }

    // --- ラベルのドラッグ移動ロジック ---
    handleMouseDown(e, entry) {
        this.draggingElement = e.target;
        this.dragTargetData = entry;
        
        const pt = this.getSVGPoint(e);
        this.dragOffsetX = pt.x - entry.labelPos.x;
        this.dragOffsetY = pt.y - entry.labelPos.y;
        
        e.target.style.cursor = 'grabbing';
        e.stopPropagation();
    }

    handleMouseMove(e) {
        if (!this.draggingElement || !this.dragTargetData) return;

        const pt = this.getSVGPoint(e);
        this.dragTargetData.labelPos.x = pt.x - this.dragOffsetX;
        this.dragTargetData.labelPos.y = pt.y - this.dragOffsetY;
        this.dragTargetData.labelPos.isCustom = true;

        this.draggingElement.setAttribute("x", this.dragTargetData.labelPos.x);
        this.draggingElement.setAttribute("y", this.dragTargetData.labelPos.y);
    }

    handleMouseUp() {
        if (this.draggingElement) {
            this.draggingElement.style.cursor = 'grab';
        }
        this.draggingElement = null;
        this.dragTargetData = null;
    }

    getSVGPoint(e) {
        const p = this.svgElement.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;
        return p.matrixTransform(this.svgElement.getScreenCTM().inverse());
    }

    // --- 描画ロジック ---
    drawPieChart() {
        const validEntries = this.dataEntries.filter(e => e.value > 0);
        this.dom.chartContainer.innerHTML = '';
        if (validEntries.length === 0) return;

        const size = 400; // 基準サイズ
        const radius = size * 0.3;
        const centerX = size / 2, centerY = size / 2;
        const total = validEntries.reduce((s, e) => s + e.value, 0);

        this.svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svgElement.setAttribute("viewBox", `0 0 ${size} ${size}`);
        this.dom.chartContainer.appendChild(this.svgElement);

        let currentAngle = -Math.PI / 2;

        validEntries.forEach((entry, i) => {
            const sliceAngle = (entry.value / total) * 2 * Math.PI;
            const midAngle = currentAngle + sliceAngle / 2;
            const endAngle = currentAngle + sliceAngle;

            // パイの描画
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", this.getArcPath(centerX, centerY, radius, currentAngle, endAngle));
            path.setAttribute("fill", this.colors[i % this.colors.length]);
            path.setAttribute("stroke", "#fff");
            this.svgElement.appendChild(path);

            // ラベルの座標計算（カスタム移動がない場合のみ初期計算）
            if (!entry.labelPos.isCustom) {
                entry.labelPos.x = centerX + (radius * 1.4) * Math.cos(midAngle);
                entry.labelPos.y = centerY + (radius * 1.4) * Math.sin(midAngle);
            }

            // ラベル要素の作成
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", entry.labelPos.x);
            text.setAttribute("y", entry.labelPos.y);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("class", "draggable-label");
            text.style.cursor = 'grab';
            text.style.userSelect = 'none';
            text.textContent = `${entry.name} (${(entry.value/total*100).toFixed(1)}%)`;

            // ラベル移動用イベントリスナー
            text.addEventListener('mousedown', (e) => this.handleMouseDown(e, entry));

            this.svgElement.appendChild(text);
            currentAngle = endAngle;
        });
    }

    getArcPath(cx, cy, r, startAngle, endAngle) {
        const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
        const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
        return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    // --- UI描画: テーブル ---
    renderTable() {
        this.dom.dataTableBody.innerHTML = '';
        const hasData = this.dataEntries.length > 0;
        this.dom.noDataMessage.classList.toggle('hidden', hasData);

        if (!hasData) {
            this.dom.downloadPngBtn.disabled = true;
            if (this.dom.chartPlaceholder) this.dom.chartPlaceholder.classList.remove('hidden');
            if (this.svgElement) this.svgElement.remove();
            this.svgElement = null;
        } else {
            if (this.dom.chartPlaceholder) this.dom.chartPlaceholder.classList.add('hidden');
        }

        this.dataEntries.forEach((entry, index) => this.createRow(entry, index));
    }

    createRow(entry, index) {
        const row = this.dom.dataTableBody.insertRow();
        row.className = 'bg-white border-b hover:bg-gray-50 transition-colors cursor-default';
        row.draggable = true;

        // ドラッグイベント
        row.ondragstart = () => {
            this.handleDragStart(index);
            row.classList.add('dragging-row');
        };
        row.ondragover = (e) => {
            e.preventDefault();
            row.classList.add('drag-over');
        };
        row.ondragleave = () => row.classList.remove('drag-over');
        row.ondragend = () => row.classList.remove('dragging-row');
        row.ondrop = (e) => {
            e.preventDefault();
            row.classList.remove('drag-over');
            this.handleDrop(index);
        };

        // 1. ハンドル (ハンバーガーアイコン)
        const hCell = row.insertCell();
        hCell.className = 'px-4 py-2 text-center';
        hCell.innerHTML = `<div class="drag-handle text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg></div>`;

        // 2. 項目名
        const nCell = row.insertCell(); nCell.className = 'px-4 py-2';
        const nInput = document.createElement('input');
        nInput.type = 'text'; nInput.value = entry.name;
        nInput.className = 'w-full p-1 border border-gray-300 rounded';
        nInput.onchange = (e) => { entry.name = e.target.value; this.drawPieChart(); };
        nCell.appendChild(nInput);

        // 3. 値
        const vCell = row.insertCell(); vCell.className = 'px-4 py-2';
        const vInput = document.createElement('input');
        vInput.type = 'number'; vInput.value = entry.value;
        vInput.className = 'w-full p-1 border border-gray-300 rounded';
        vInput.onchange = (e) => { entry.value = Math.max(0, parseFloat(e.target.value) || 0); this.drawPieChart(); };
        vCell.appendChild(vInput);

        // 4. 画像
        const iCell = row.insertCell(); iCell.className = 'px-4 py-2';
        const iInput = document.createElement('input');
        iInput.type = 'file'; iInput.accept = 'image/*'; iInput.className = 'text-xs w-full';
        iInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    entry.imageSrc = ev.target.result;
                    this.refresh();
                };
                reader.readAsDataURL(file);
            }
        };
        iCell.appendChild(iInput);
        if (entry.imageSrc) {
            const preview = document.createElement('img');
            preview.src = entry.imageSrc; preview.className = 'h-8 w-auto mt-1 rounded';
            iCell.appendChild(preview);
        }

        // 5. アクション
        const aCell = row.insertCell(); aCell.className = 'px-4 py-2 text-center';
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '🗑️';
        delBtn.onclick = () => this.removeEntry(entry.id);
        aCell.appendChild(delBtn);
    }

    // --- UI描画: グラフ ---
    drawPieChart() {
        const validEntries = this.dataEntries.filter(e => e.value > 0);
        if (validEntries.length === 0) {
            this.dom.chartContainer.innerHTML = '<p class="text-gray-400">データがありません</p>';
            return;
        }

        if (this.svgElement) this.svgElement.remove();
        this.dom.downloadPngBtn.disabled = false;

        const size = this.dom.chartContainer.clientWidth || 400;
        const radius = size * 0.35;
        const centerX = size / 2, centerY = size / 2;
        const total = validEntries.reduce((s, e) => s + e.value, 0);

        this.svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svgElement.setAttribute("viewBox", `0 0 ${size} ${size}`);
        this.dom.chartContainer.appendChild(this.svgElement);

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        this.svgElement.appendChild(defs);

        let currentAngle = -Math.PI / 2;
        validEntries.forEach((entry, i) => {
            const sliceAngle = (entry.value / total) * 2 * Math.PI;
            const endAngle = currentAngle + sliceAngle;
            const midAngle = currentAngle + sliceAngle / 2;

            // パターン・クリップパス設定 (画像がある場合)
            if (entry.imageSrc) {
                const pId = `p-${entry.id}`;
                const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
                pattern.setAttribute("id", pId); pattern.setAttribute("patternUnits", "userSpaceOnUse");
                pattern.setAttribute("width", size); pattern.setAttribute("height", size);
                
                const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
                img.setAttributeNS("http://www.w3.org/1999/xlink", "href", entry.imageSrc);
                
                const imgSize = radius * 2 * entry.imageSettings.scale;
                const ix = centerX + (radius*0.6) * Math.cos(midAngle) - imgSize/2 + entry.imageSettings.offsetX;
                const iy = centerY + (radius*0.6) * Math.sin(midAngle) - imgSize/2 + entry.imageSettings.offsetY;
                
                img.setAttribute("x", ix); img.setAttribute("y", iy);
                img.setAttribute("width", imgSize); img.setAttribute("height", imgSize);
                pattern.appendChild(img); defs.appendChild(pattern);
            }

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", this.getArcPath(centerX, centerY, radius, currentAngle, endAngle));
            path.setAttribute("fill", entry.imageSrc ? `url(#p-${entry.id})` : this.colors[i % this.colors.length]);
            path.setAttribute("stroke", "#fff");
            path.onclick = () => this.selectSlice(entry);
            this.svgElement.appendChild(path);

            // ラベル表示
            const lx = centerX + (radius * 1.3) * Math.cos(midAngle);
            const ly = centerY + (radius * 1.3) * Math.sin(midAngle);
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", lx); text.setAttribute("y", ly);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-size", "12");
            text.textContent = `${entry.name} (${(entry.value/total*100).toFixed(1)}%)`;
            this.svgElement.appendChild(text);

            currentAngle = endAngle;
        });
    }

    getArcPath(cx, cy, r, startAngle, endAngle) {
        const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
        const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
        return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    selectSlice(entry) {
        this.selectedEntryId = entry.id;
        this.dom.selectedItemNameSpan.textContent = entry.name;
        this.dom.imageScaleInput.value = entry.imageSettings.scale;
        this.dom.imageOffsetXInput.value = entry.imageSettings.offsetX;
        this.dom.imageOffsetYInput.value = entry.imageSettings.offsetY;
        this.dom.imageControlsContainer.classList.remove('hidden');
    }

    updateImageSetting(prop, val) {
        const entry = this.dataEntries.find(e => e.id === this.selectedEntryId);
        if (entry) {
            entry.imageSettings[prop] = parseFloat(val);
            this.drawPieChart();
        }
    }

}
