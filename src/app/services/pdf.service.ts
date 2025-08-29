import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Client, Quote } from '../models/types';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  generateQuotePdf(client: Client, quote: Quote): void {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Conductores del Mundo', 20, 20);
    doc.setFontSize(16);
    doc.text('Cotización de Plan', 20, 35);
    
    // Client info
    doc.setFontSize(12);
    doc.text(`Cliente: ${client.name}`, 20, 55);
    doc.text(`Tipo de Plan: ${quote.flow}`, 20, 65);
    doc.text(`Mercado: ${quote.market}`, 20, 75);
    doc.text(`Tipo de Cliente: ${quote.clientType}`, 20, 85);
    
    // Quote details table
    const quoteData = [
      ['Precio Total', `$${quote.totalPrice.toLocaleString('es-MX')}`],
      ['Enganche', `$${quote.downPayment.toLocaleString('es-MX')}`],
      ['Monto a Financiar', `$${quote.amountToFinance.toLocaleString('es-MX')}`],
      ['Plazo', `${quote.term} meses`],
      ['Pago Mensual', `$${quote.monthlyPayment.toLocaleString('es-MX')}`]
    ];

    doc.autoTable({
      head: [['Concepto', 'Monto']],
      body: quoteData,
      startY: 100,
      theme: 'striped',
      styles: {
        fontSize: 10,
        textColor: [51, 51, 51]
      },
      headStyles: {
        fillColor: [6, 182, 212], // primary-cyan-500
        textColor: [255, 255, 255]
      }
    });
    
    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.text('Generado por Conductores del Mundo - Asesor PWA', 20, finalY + 20);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 20, finalY + 30);
    
    // Save
    doc.save(`cotizacion-${client.name.replace(/\s+/g, '-')}.pdf`);
  }

  generateClientReportPdf(client: Client): void {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Conductores del Mundo', 20, 20);
    doc.setFontSize(16);
    doc.text('Reporte de Cliente', 20, 35);
    
    // Client info
    doc.setFontSize(14);
    doc.text(`${client.name}`, 20, 55);
    doc.setFontSize(12);
    doc.text(`Plan: ${client.flow}`, 20, 70);
    doc.text(`Estado: ${client.status}`, 20, 80);
    
    if (client.healthScore) {
      doc.text(`Score de Salud: ${client.healthScore}/100`, 20, 90);
    }
    
    // Payment/Savings info
    let startY = 110;
    if (client.savingsPlan) {
      doc.setFontSize(14);
      doc.text('Plan de Ahorro', 20, startY);
      doc.setFontSize(12);
      doc.text(`Meta: $${client.savingsPlan.goal.toLocaleString('es-MX')}`, 20, startY + 15);
      doc.text(`Progreso: $${client.savingsPlan.progress.toLocaleString('es-MX')}`, 20, startY + 25);
      doc.text(`Valor Total: $${client.savingsPlan.totalValue.toLocaleString('es-MX')}`, 20, startY + 35);
      startY += 55;
    }
    
    if (client.paymentPlan) {
      doc.setFontSize(14);
      doc.text('Plan de Pagos', 20, startY);
      doc.setFontSize(12);
      doc.text(`Meta Mensual: $${client.paymentPlan.monthlyGoal.toLocaleString('es-MX')}`, 20, startY + 15);
      doc.text(`Progreso Actual: $${client.paymentPlan.currentMonthProgress.toLocaleString('es-MX')}`, 20, startY + 25);
      startY += 45;
    }
    
    // Recent events table
    if (client.events && client.events.length > 0) {
      const recentEvents = client.events.slice(-10).map(event => [
        event.timestamp.toLocaleDateString('es-MX'),
        event.actor,
        event.message,
        event.details?.amount ? `$${event.details.amount.toLocaleString('es-MX')}` : '-'
      ]);

      doc.autoTable({
        head: [['Fecha', 'Actor', 'Evento', 'Monto']],
        body: recentEvents,
        startY: startY,
        theme: 'striped',
        styles: {
          fontSize: 8,
          textColor: [51, 51, 51]
        },
        headStyles: {
          fillColor: [6, 182, 212],
          textColor: [255, 255, 255]
        },
        columnStyles: {
          2: { cellWidth: 80 }
        }
      });
    }
    
    // Footer
    const finalY = (doc as any).lastAutoTable?.finalY || startY + 20;
    doc.setFontSize(10);
    doc.text('Generado por Conductores del Mundo - Asesor PWA', 20, finalY + 20);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 20, finalY + 30);
    
    // Save
    doc.save(`reporte-${client.name.replace(/\s+/g, '-')}.pdf`);
  }

  generateDocumentStatusPdf(client: Client): void {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Conductores del Mundo', 20, 20);
    doc.setFontSize(16);
    doc.text('Estado de Documentos', 20, 35);
    
    // Client info
    doc.setFontSize(14);
    doc.text(`Cliente: ${client.name}`, 20, 55);
    doc.setFontSize(12);
    doc.text(`Plan: ${client.flow}`, 20, 70);
    
    // Documents table
    const documentsData = client.documents.map(doc => [
      doc.name,
      doc.status,
      doc.isOptional ? 'Opcional' : 'Requerido'
    ]);

    doc.autoTable({
      head: [['Documento', 'Estado', 'Tipo']],
      body: documentsData,
      startY: 85,
      theme: 'striped',
      styles: {
        fontSize: 10,
        textColor: [51, 51, 51]
      },
      headStyles: {
        fillColor: [6, 182, 212],
        textColor: [255, 255, 255]
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 }
      }
    });
    
    // Summary
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    const totalDocs = client.documents.length;
    const approvedDocs = client.documents.filter(d => d.status === 'Aprobado').length;
    const pendingDocs = client.documents.filter(d => d.status === 'Pendiente').length;
    
    doc.setFontSize(12);
    doc.text('Resumen:', 20, finalY + 20);
    doc.text(`Total de documentos: ${totalDocs}`, 30, finalY + 35);
    doc.text(`Aprobados: ${approvedDocs}`, 30, finalY + 45);
    doc.text(`Pendientes: ${pendingDocs}`, 30, finalY + 55);
    doc.text(`Progreso: ${Math.round((approvedDocs / totalDocs) * 100)}%`, 30, finalY + 65);
    
    // Footer
    doc.setFontSize(10);
    doc.text('Generado por Conductores del Mundo - Asesor PWA', 20, finalY + 85);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 20, finalY + 95);
    
    // Save
    doc.save(`documentos-${client.name.replace(/\s+/g, '-')}.pdf`);
  }
}