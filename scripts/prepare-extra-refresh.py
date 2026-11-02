"""Stage Dynamic Democracy CSVs without combining or reinterpreting records."""
import base64
import collections
import csv
import hashlib
import json
import pathlib
import time
import sys
from datetime import datetime, timezone
import zlib

ROOT = pathlib.Path(sys.argv[1])
DOWNLOADS = ROOT
SOURCES = [
    ('opinion', 'Public opinion', 'opinion.csv'),
    ('proximity', 'Policy proximity', 'proximity.csv'),
    ('mass_cultural', 'Mass ideology: cultural', 'mass_cultural.csv'),
    ('mass_economic', 'Mass ideology: economic', 'mass_economic.csv'),
    ('policy_constant', 'State policy ideology: constant', 'policy_constant.csv'),
    ('policy_evolving', 'State policy ideology: evolving', 'policy_evolving.csv'),
    ('policy_cultural', 'State policy ideology: cultural', 'policy_cultural.csv'),
    ('policy_economic', 'State policy ideology: economic', 'policy_economic.csv'),
]

def packed(value):
    raw = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    return zlib.compress(raw, 9)

started = time.perf_counter()
entries = []
full_bytes = compact_bytes = total_rows = 0
sources = []
for dataset, title, filename in SOURCES:
    path = DOWNLOADS / filename
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    grouped = collections.defaultdict(list)
    with path.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        columns = reader.fieldnames
        for record in reader:
            key = record.get('policy') or dataset
            grouped[key].append(record)
    for key, rows in grouped.items():
        compact = {'columns': columns, 'rows': [[row[col] for col in columns] for row in rows]}
        legacy = packed(rows)
        data = packed(compact)
        reconstructed = [dict(zip(compact['columns'], row)) for row in compact['rows']]
        if reconstructed != rows:
            raise ValueError(f'Round trip changed records for {dataset}: {key}')
        full_bytes += len(legacy)
        compact_bytes += len(data)
        total_rows += len(rows)
        identity = hashlib.sha256((dataset + '\0' + key).encode('utf8')).hexdigest()[:24]
        entries.append({'id': identity, 'dataset': dataset, 'title': rows[0].get('policy_name') or title,
                        'variable': key, 'count': len(rows), 'source_file': filename,
                        'data': base64.b64encode(data).decode('ascii')})
    sources.append({'dataset': dataset, 'file': filename, 'sha256': digest, 'groups': len(grouped),
                    'rows': sum(map(len, grouped.values()))})
output = ROOT / 'extended-staging.jsonl'
with output.open('w', encoding='utf8', newline='\n') as stream:
    for entry in entries:
        stream.write(json.dumps(entry, ensure_ascii=False, separators=(',', ':')) + '\n')
result = {'task': 'extended-dataset-storage-encoding', 'date': datetime.now(timezone.utc).date().isoformat(),
          'rows': total_rows, 'groups': len(entries), 'dictionary_zlib_bytes': full_bytes,
          'columns_and_rows_zlib_bytes': compact_bytes, 'seconds_both_encodings_and_roundtrip': round(time.perf_counter() - started, 3),
          'largest_staged_document_bytes': max(len(json.dumps(x, ensure_ascii=False).encode('utf8')) for x in entries),
          'integrity': 'Each original CSV row reconstructed exactly, with order and all fields preserved.', 'sources': sources}
(ROOT / 'extended-staging-report.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf8', newline='\n')
with (ROOT / 'performance-history.jsonl').open('a', encoding='utf8', newline='\n') as stream:
    stream.write(json.dumps(result, separators=(',', ':')) + '\n')
print(json.dumps(result, indent=2))
