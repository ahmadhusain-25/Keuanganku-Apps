import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Transaction } from '../api';

interface PDFReportOptions {
  transactions: Transaction[];
  startDate: string;
  endDate: string;
  preset: string;
  userName: string;
  themeColor: string;
}

export const generateFinancialReport = ({
  transactions,
  startDate,
  endDate,
  preset,
  userName,
  themeColor
}: PDFReportOptions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header Background
  doc.setFillColor(themeColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // App Title & Logo placeholder (text based for simplicity)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('KEUANGANKU', 15, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Laporan Keuangan Personal Digital', 15, 32);
  
  // User info
  doc.setFontSize(10);
  doc.text(`User: ${userName}`, pageWidth - 15, 25, { align: 'right' });
  doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`, pageWidth - 15, 32, { align: 'right' });
  
  // Report Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Ringkasan Laporan Finansial', 15, 55);
  
  // Date Range Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateRangeText = preset === 'all' 
    ? 'Periode: Semua Riwayat' 
    : `Periode: ${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}`;
  doc.text(dateRangeText, 15, 62);
  
  // Calculate Totals
  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;
  
  // Summary Cards (Stylized Boxes)
  const cardWidth = (pageWidth - 40) / 3;
  
  // Income Card
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(240, 255, 240);
  doc.roundedRect(15, 70, cardWidth, 25, 3, 3, 'FD');
  doc.setTextColor(40, 100, 40);
  doc.setFontSize(9);
  doc.text('Total Pemasukan', 15 + (cardWidth / 2), 78, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rp ${totalIncome.toLocaleString('id-ID')}`, 15 + (cardWidth / 2), 87, { align: 'center' });
  
  // Expense Card
  doc.setFillColor(255, 240, 240);
  doc.roundedRect(15 + cardWidth + 5, 70, cardWidth, 25, 3, 3, 'FD');
  doc.setTextColor(150, 40, 40);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Pengeluaran', 15 + cardWidth + 5 + (cardWidth / 2), 78, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rp ${totalExpense.toLocaleString('id-ID')}`, 15 + cardWidth + 5 + (cardWidth / 2), 87, { align: 'center' });
  
  // Balance Card
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(15 + (cardWidth * 2) + 10, 70, cardWidth, 25, 3, 3, 'FD');
  doc.setTextColor(40, 40, 150);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Saldo Akhir', 15 + (cardWidth * 2) + 10 + (cardWidth / 2), 78, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rp ${balance.toLocaleString('id-ID')}`, 15 + (cardWidth * 2) + 10 + (cardWidth / 2), 87, { align: 'center' });
  
  // Transaction Table
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text('Detail Riwayat Transaksi', 15, 110);
  
  const tableData = transactions.map((t, index) => [
    index + 1,
    t.date || '-',
    t.type === 'Income' ? 'Pemasukan' : 'Pengeluaran',
    t.category || '-',
    `Rp ${t.amount.toLocaleString('id-ID')}`,
    t.description || '-'
  ]);
  
  (doc as any).autoTable({
    startY: 115,
    head: [['#', 'Tanggal', 'Jenis', 'Kategori', 'Nominal', 'Keterangan']],
    body: tableData,
    headStyles: {
      fillColor: themeColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 35, halign: 'right' },
      5: { cellWidth: 'auto' }
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    margin: { top: 10, left: 15, right: 15 },
    styles: {
      fontSize: 9,
      cellPadding: 3
    }
  });
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Digenerate secara otomatis oleh Owi AI - Keuanganku Versi Digital.',
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - 15,
      doc.internal.pageSize.height - 10,
      { align: 'right' }
    );
  }
  
  // Save PDF
  const fileName = `Laporan_Keuangan_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
};
