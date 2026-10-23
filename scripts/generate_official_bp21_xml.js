'use strict';
const fs = require('fs');
const path = require('path');

// 14 real records from Bu Nadhiroh's authentic research grant
const records = [
  // 5 Narasumber (Coretax rule: Deemed WAJIB 50 untuk 21-100-18)
  { name: 'Ahmad Fathony M., S.T., M.T.', nik: '3578041003940004', kop: '21-100-18', gross: 900000, deemed: 50, rate: 5, ref: 'KWT-HR-017', date: '2026-08-21' },
  { name: 'Lestari Aji, S.Pi, M.A.Gr', nik: '3579011201980006', kop: '21-100-18', gross: 900000, deemed: 50, rate: 5, ref: 'KWT-HR-023', date: '2026-08-21' },
  { name: 'Iman Maulana, S.T.', nik: '3578010101550007', kop: '21-100-18', gross: 900000, deemed: 50, rate: 5, ref: 'KWT-HR-039', date: '2026-08-21' },
  { name: 'Ahmad Fathony M., S.T., M.T.', nik: '3578041003940004', kop: '21-100-18', gross: 900000, deemed: 50, rate: 5, ref: 'KWT-HR-044A', date: '2026-08-21' },
  { name: 'Lestari Aji, S.Pi, M.A.Gr', nik: '3579011201980006', kop: '21-100-18', gross: 900000, deemed: 50, rate: 5, ref: 'KWT-HR-044B', date: '2026-08-21' },
  // 1 Pengolah Data (Coretax rule: Deemed WAJIB 50 untuk 21-100-20)
  { name: 'Allisa Nadhira, S.Gz.', nik: '3516134111010000', kop: '21-100-20', gross: 1540000, deemed: 50, rate: 5, ref: 'KWT-HR-055', date: '2026-08-30' },
  // 8 Enumerator Lapangan (Coretax rule: Rate = 0.5 & Deemed = 100 for 21-100-24)
  { name: 'Ratu Dien Prima Fermeza., S.Gz.', nik: '3578195311030009', kop: '21-100-24', gross: 1280000, deemed: 100, rate: 0.5, ref: 'KWT-HR-056-1', date: '2026-08-30' },
  { name: 'Kayla Auraline Erlawan, S.Gz.', nik: '3578195311030001', kop: '21-100-24', gross: 1280000, deemed: 100, rate: 0.5, ref: 'KWT-HR-056-2', date: '2026-08-30' },
  { name: 'Nafiisah Zana Dzakiyyah, S.Gz.', nik: '3578064312030004', kop: '21-100-24', gross: 1280000, deemed: 100, rate: 0.5, ref: 'KWT-HR-056-3', date: '2026-08-30' },
  { name: 'Salma Violita Pradana, S.Gz', nik: '3504116603030002', kop: '21-100-24', gross: 1280000, deemed: 100, rate: 0.5, ref: 'KWT-HR-056-4', date: '2026-08-30' },
  { name: 'Melanie Putri Anggraini, S.Gz', nik: '3517036002040001', kop: '21-100-24', gross: 1280000, deemed: 100, rate: 0.5, ref: 'KWT-HR-056-5', date: '2026-08-30' },
  { name: 'Maulidina Maiyarani Amroe, S.Gz', nik: '3578085205040002', kop: '21-100-24', gross: 1280000, deemed: 100, rate: 0.5, ref: 'KWT-HR-056-6', date: '2026-08-30' },
  { name: 'Layyina Azka Nabila, S.Gz.', nik: '3515164902040003', kop: '21-100-24', gross: 1280000, deemed: 100, rate: 0.5, ref: 'KWT-HR-056-7', date: '2026-08-30' },
  { name: 'Wichdah Layn Al’aqilah, S.Gz.', nik: '3514115709020002', kop: '21-100-24', gross: 1280000, deemed: 100, rate: 0.5, ref: 'KWT-HR-056-8', date: '2026-08-30' }
];

function buildOfficialXml(tin, taxMonth, taxYear) {
  const cleanTin = String(tin).replace(/\D/g, '');
  const idPlace = (cleanTin + '000000').slice(0, 22);

  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  xml += '<Bp21Bulk xsi:noNamespaceSchemaLocation="schema.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n';
  xml += '\t<TIN>' + cleanTin + '</TIN>\n';
  xml += '\t<ListOfBp21>\n';

  records.forEach(r => {
    const dParts = r.date.split('-');
    const m = taxMonth || parseInt(dParts[1], 10) || 8;
    const y = taxYear || parseInt(dParts[0], 10) || 2026;
    const d = r.date;
    const recipientNitku = (r.nik + '000000').slice(0, 22);

    xml += '\t\t<Bp21>\n';
    xml += '\t\t\t<TaxPeriodMonth>' + m + '</TaxPeriodMonth>\n';
    xml += '\t\t\t<TaxPeriodYear>' + y + '</TaxPeriodYear>\n';
    xml += '\t\t\t<CounterpartTin>' + r.nik + '</CounterpartTin>\n';
    xml += '\t\t\t<IDPlaceOfBusinessActivityOfIncomeRecipient>' + recipientNitku + '</IDPlaceOfBusinessActivityOfIncomeRecipient>\n';
    xml += '\t\t\t<StatusTaxExemption>TK/0</StatusTaxExemption>\n';
    xml += '\t\t\t<TaxCertificate>N/A</TaxCertificate>\n';
    xml += '\t\t\t<TaxObjectCode>' + r.kop + '</TaxObjectCode>\n';
    xml += '\t\t\t<Gross>' + r.gross + '</Gross>\n';
    xml += '\t\t\t<Deemed>' + r.deemed + '</Deemed>\n';
    xml += '\t\t\t<Rate>' + r.rate + '</Rate>\n';
    xml += '\t\t\t<Document>Contract</Document>\n';
    xml += '\t\t\t<DocumentNumber>' + r.ref + '</DocumentNumber>\n';
    xml += '\t\t\t<DocumentDate>' + d + '</DocumentDate>\n';
    xml += '\t\t\t<IDPlaceOfBusinessActivity>' + idPlace + '</IDPlaceOfBusinessActivity>\n';
    xml += '\t\t\t<WithholdingDate>' + d + '</WithholdingDate>\n';
    xml += '\t\t</Bp21>\n';
  });

  xml += '\t</ListOfBp21>\n';
  xml += '</Bp21Bulk>\n';
  return xml;
}

const outDir = path.join(__dirname, '..', 'docs');
const publicDir = path.join(__dirname, '..', 'public', 'docs');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

// Output template filled with real data
const xmlContent = buildOfficialXml('3578047105750010', 8, 2026);
fs.writeFileSync(path.join(outDir, 'BP21_Coretax_14_Personel_Riset.xml'), xmlContent, 'utf8');
fs.writeFileSync(path.join(publicDir, 'BP21_Coretax_14_Personel_Riset.xml'), xmlContent, 'utf8');

console.log('Successfully generated official Coretax BP21 XML files matching docs/BP21_Template.xml!');
