/**
 * データの保存と読み込みを管理するモジュール
 */
const PieChartStorage = {
    SAVE_KEY: 'pie_chart_data',

    /**
     * データをLocalStorageに保存する
     * @param {Array} dataEntries - データエントリの配列
     * @param {number} nextEntryId - 次のエントリID
     */
    save: function (dataEntries, nextEntryId) {
        try {
            const dataToSave = {
                dataEntries: dataEntries,
                nextEntryId: nextEntryId
            };
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.error('Failed to save data to localStorage:', e);
        }
    },

    /**
     * LocalStorageからデータを読み込む
     * @returns {object|null} 保存されたデータ、またはnull
     */
    load: function () {
        try {
            const savedData = localStorage.getItem(this.SAVE_KEY);
            return savedData ? JSON.parse(savedData) : null;
        } catch (e) {
            console.error('Failed to load data from localStorage:', e);
            return null;
        }
    }
};
