import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from 'docx';
import { PRD } from '../models/PRD';
import { Feedback } from '../models/Feedback';

/**
 * Helper to escape CSV values containing double quotes or commas.
 */
function escapeCsvValue(val: any): string {
  if (val === undefined || val === null) {
    return '""';
  }
  const str = String(val).trim();
  // Escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * GET /api/export/pdf/prd/:id
 * Exports a saved PRD draft as a stylized PDF.
 */
export async function exportPRDToPDF(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const prd = await PRD.findById(id);

    if (!prd) {
      res.status(404).json({ success: false, error: 'PRD not found' });
      return;
    }

    // Initialize PDF Document
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    const safeTitle = prd.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="prd_${safeTitle}.pdf"`);

    // Stream PDF directly to response
    doc.pipe(res);

    // Styling & Header
    doc.fillColor('#1A1F2C')
       .fontSize(26)
       .font('Helvetica-Bold')
       .text(prd.title, { align: 'left' });

    doc.moveDown(0.2);

    // Meta details
    doc.fontSize(10)
       .font('Helvetica-Oblique')
       .fillColor('#64748B')
       .text(`Feature: ${prd.feature || 'General'} | Status: ${prd.status.toUpperCase()} | Generated: ${prd.createdAt.toLocaleDateString()}`);

    doc.moveDown(0.5);
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Overview section
    if (prd.overview) {
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#0F172A')
         .text('Product Overview');
      
      doc.moveDown(0.4);

      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#334155')
         .text(prd.overview, { align: 'justify', lineGap: 4 });
      
      doc.moveDown(1.5);
    }

    // Dynamic Sections
    if (prd.sections && prd.sections.length > 0) {
      for (const section of prd.sections) {
        if (!section.heading || !section.items || section.items.length === 0) {
          continue;
        }

        // Avoid orphaned headers (page breaks)
        if (doc.y > 700) {
          doc.addPage();
        }

        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#0F172A')
           .text(section.heading);

        doc.moveDown(0.5);

        for (const item of section.items) {
          doc.fontSize(11)
             .font('Helvetica')
             .fillColor('#334155')
             .text(`• ${item}`, { lineGap: 3, indent: 15 });
          doc.moveDown(0.2);
        }

        doc.moveDown(1);
      }
    }

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#94A3B8')
         .text(
           `AI Product Manager Copilot — Page ${i + 1} of ${pages.count}`,
           50,
           800,
           { align: 'center', width: 495 }
         );
    }

    // End / close document
    doc.end();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/export/docx/prd/:id
 * Exports a saved PRD draft as a Word Document (.docx).
 */
export async function exportPRDToDOCX(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const prd = await PRD.findById(id);

    if (!prd) {
      res.status(404).json({ success: false, error: 'PRD not found' });
      return;
    }

    const docChildren: any[] = [];

    // Document Title
    docChildren.push(
      new Paragraph({
        text: prd.title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 120 },
      })
    );

    // Meta details
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Feature: ${prd.feature || 'General'}   |   `, italics: true, color: '64748B' }),
          new TextRun({ text: `Status: ${prd.status.toUpperCase()}   |   `, italics: true, color: '64748B' }),
          new TextRun({ text: `Created: ${prd.createdAt.toLocaleDateString()}`, italics: true, color: '64748B' }),
        ],
        spacing: { after: 360 },
      })
    );

    // Product Overview
    if (prd.overview) {
      docChildren.push(
        new Paragraph({
          text: 'Product Overview',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
      docChildren.push(
        new Paragraph({
          text: prd.overview,
          spacing: { after: 240 },
        })
      );
    }

    // Dynamic Sections
    if (prd.sections && prd.sections.length > 0) {
      for (const section of prd.sections) {
        if (!section.heading || !section.items || section.items.length === 0) {
          continue;
        }

        docChildren.push(
          new Paragraph({
            text: section.heading,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          })
        );

        for (const item of section.items) {
          docChildren.push(
            new Paragraph({
              text: item,
              bullet: { level: 0 },
              spacing: { after: 60 },
            })
          );
        }
      }
    }

    // Create the document
    const doc = new DocxDocument({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    // Packer creates DOCX buffer
    const buffer = await Packer.toBuffer(doc);

    const safeTitle = prd.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="prd_${safeTitle}.docx"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/export/csv/feedback
 * Exports feedback records as a downloadable CSV sheet.
 * Supports filters like category/priority/sentiment.
 */
export async function exportFeedbackToCSV(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { category, priority, sentiment } = req.query as {
      category?: string;
      priority?: string;
      sentiment?: string;
    };

    // Build filter matching the UI table filters
    const filter: Record<string, any> = {};
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (sentiment) filter.sentiment = sentiment;

    // Load up to 2000 records for the sheet export to prevent memory limits
    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .limit(2000);

    // CSV Headers
    const headers = [
      'Feedback ID',
      'Date',
      'Category',
      'Sentiment',
      'Priority',
      'Source',
      'Rating',
      'Feedback Text',
    ];

    let csvContent = headers.join(',') + '\r\n';

    // Append rows
    for (const fb of feedbacks) {
      const row = [
        escapeCsvValue(fb.feedbackId || fb._id),
        escapeCsvValue(fb.createdAt ? fb.createdAt.toISOString() : ''),
        escapeCsvValue(fb.category || ''),
        escapeCsvValue(fb.sentiment || ''),
        escapeCsvValue(fb.priority || ''),
        escapeCsvValue(fb.source || ''),
        escapeCsvValue(fb.rating !== undefined ? fb.rating : ''),
        escapeCsvValue(fb.text || ''),
      ];
      csvContent += row.join(',') + '\r\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="feedback_export.csv"');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
}
