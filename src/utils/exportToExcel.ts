import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export function exportToExcel(
  sheets: {
    sheetName: string;
    data: Record<string, any>[];
  }[],
  fileName: string
) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data }) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `${fileName}.xlsx`);
}
