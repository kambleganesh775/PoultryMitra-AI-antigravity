import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportService = {
  /**
   * Export data to Excel (.xlsx)
   * @param data Array of objects to export
   * @param fileName Name of the file (without extension)
   * @param sheetName Name of the worksheet
   */
  exportToExcel: (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
    // 1. Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // 2. Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // 3. Append worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 4. Write file
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  },

  /**
   * Export data to PDF with a table
   * @param title Title of the report
   * @param columns Array of column headers
   * @param rows Array of arrays (data corresponding to columns)
   * @param fileName Name of the file (without extension)
   */
  exportToPDF: (title: string, columns: string[], rows: any[][], fileName: string) => {
    const doc = new jsPDF();

    // Add Title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    // Add Date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Add Table
    autoTable(doc, {
      startY: 35,
      head: [columns],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12] }, // Orange-600 color
      styles: { fontSize: 8 },
    });

    // Save
    doc.save(`${fileName}.pdf`);
  },

  /**
   * Generate a Sales Invoice PDF
   * @param sale The sales record object OR Invoice object
   * @param farmName Name of the farm (optional)
   */
  generateInvoicePDF: (sale: any, farmName: string = 'My Poultry Farm') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Determine if it's a simple Sale or a full Invoice
    const isFullInvoice = !!sale.invoiceNumber;
    const invoiceId = isFullInvoice ? sale.invoiceNumber : sale.id;
    const date = sale.date;
    const buyerName = isFullInvoice ? sale.customerName : (sale.buyerName || "Cash Customer");
    const buyerAddress = isFullInvoice ? sale.customerAddress : "";
    
    // --- Header ---
    doc.setFillColor(255, 247, 237); // Orange-50
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(194, 65, 12); // Orange-700
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(farmName, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text("Sales Invoice", pageWidth - 14, 20, { align: 'right' });
    doc.text(`Invoice #: ${invoiceId}`, pageWidth - 14, 26, { align: 'right' });
    doc.text(`Date: ${date}`, pageWidth - 14, 32, { align: 'right' });
    if (isFullInvoice && sale.dueDate) {
        doc.text(`Due Date: ${sale.dueDate}`, pageWidth - 14, 38, { align: 'right' });
    }

    // --- Bill To ---
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Bill To:", 14, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(buyerName, 14, 62);
    if (buyerAddress) {
        doc.text(buyerAddress, 14, 68);
    }

    // --- Item Details Table ---
    const tableColumn = ["Description", "Quantity", "Rate", "Amount"];
    let tableRows = [];

    if (isFullInvoice) {
        tableRows = sale.items.map((item: any) => [
            item.description,
            item.quantity,
            `Rs. ${item.rate}`,
            `Rs. ${item.amount.toLocaleString()}`
        ]);
    } else {
        tableRows = [
            [
                `${sale.breed} (${sale.saleType === 'kg' ? 'Sold by Weight' : 'Sold by Count'})`,
                sale.saleType === 'kg' ? `${sale.weightKg} kg` : `${sale.quantity} birds`,
                `Rs. ${sale.rate} / ${sale.saleType === 'kg' ? 'kg' : 'bird'}`,
                `Rs. ${sale.totalAmount.toLocaleString()}`
            ]
        ];
    }

    autoTable(doc, {
      startY: buyerAddress ? 80 : 75,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        3: { halign: 'right', fontStyle: 'bold' }
      }
    });

    // --- Totals ---
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY || 100;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    let currentY = finalY + 10;

    if (isFullInvoice) {
        doc.text("Subtotal:", pageWidth - 60, currentY);
        doc.text(`Rs. ${sale.subTotal.toLocaleString()}`, pageWidth - 14, currentY, { align: 'right' });
        currentY += 6;

        if (sale.taxAmount > 0) {
            doc.text(`Tax (${sale.taxRate}%):`, pageWidth - 60, currentY);
            doc.text(`Rs. ${sale.taxAmount.toLocaleString()}`, pageWidth - 14, currentY, { align: 'right' });
            currentY += 6;
        }
    }

    doc.setFontSize(12);
    doc.setTextColor(22, 163, 74); // Green-600
    doc.text("Total Amount:", pageWidth - 60, currentY + 2);
    doc.text(`Rs. ${sale.totalAmount.toLocaleString()}`, pageWidth - 14, currentY + 2, { align: 'right' });

    // --- Payment Info ---
    if (isFullInvoice) {
        currentY += 15;
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text("Payment Status:", 14, currentY);
        
        const statusColor = sale.status === 'Paid' ? [22, 163, 74] : sale.status === 'Overdue' ? [220, 38, 38] : [234, 179, 8];
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(sale.status.toUpperCase(), 45, currentY);

        if (sale.amountPaid > 0) {
            currentY += 6;
            doc.setTextColor(0);
            doc.text(`Amount Paid: Rs. ${sale.amountPaid.toLocaleString()}`, 14, currentY);
        }
    }

    // --- Footer ---
    doc.setTextColor(150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text("Thank you for your business!", pageWidth / 2, pageWidth - 20, { align: 'center' });
    
    // Save
    doc.save(`Invoice_${invoiceId}.pdf`);
  }
};