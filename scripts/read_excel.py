import zipfile
import xml.etree.ElementTree as ET

z = zipfile.ZipFile('docs/RAB Pajak Realisasi Bu Nadhiroh - 17 Agst 2026 2.xlsx')
sst = ET.fromstring(z.read('xl/sharedStrings.xml'))
strings = [''.join(t.text or '' for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')) for si in sst]

root = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

print("=== ALL NON-EMPTY ROWS IN EXCEL ===")
for row in root.findall('.//s:row', ns):
    r_idx = row.get('r')
    vals = []
    for c in row.findall('s:c', ns):
        v = c.find('s:v', ns)
        t = c.get('t')
        val = ''
        if v is not None and v.text:
            if t == 's':
                val = strings[int(v.text)]
            else:
                val = v.text
        if val.strip():
            vals.append(c.get('r') + ': ' + val.strip())
    if vals:
        print('R' + r_idx + ': ' + ' | '.join(vals))
