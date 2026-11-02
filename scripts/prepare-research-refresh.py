import csv,json,collections,pathlib,zlib,base64,hashlib
import sys
root=pathlib.Path(sys.argv[1])
dynamic=root/'state_policies.csv'
book=root/'policy_codebook.csv'
output=root/'metrics.jsonl'
def clean(x):
 x=(x or '').strip();return '' if x.upper() in ('NA','N/A','NULL') else x
def enc(x): return base64.b64encode(zlib.compress(json.dumps(x,separators=(',',':'),ensure_ascii=False).encode('utf-8'),9)).decode('ascii')
def ident(source,var): return hashlib.sha256((source+'\0'+var).encode()).hexdigest()[:24]
metrics=[]
with (root/'cspp-codebook.csv').open(encoding='utf-8-sig',newline='') as f: cb={r['variable']:r for r in csv.DictReader(f)}
with (root/'cspp.csv').open(encoding='utf-8-sig',newline='') as f:
 rd=csv.reader(f); headers=next(rd); data=[[] for _ in headers[6:]]; row_count=0; seen=set()
 for r in rd:
  row_count+=1; k=(r[0],r[5]);
  if k in seen: raise ValueError('duplicate CSPP state/year '+str(k))
  seen.add(k)
  for i,v in enumerate(r[6:]):
   v=clean(v)
   if v: data[i].append([int(r[5]),r[0],v])
for var,vals in zip(headers[6:],data):
 c=cb[var];meta={'id':ident('cspp',var),'dataset':'cspp','variable':var,'title':clean(c['short_desc']) or var,'years':clean(c['years']),'category':clean(c['category']),'description':clean(c['long_desc']),'sources':clean(c['sources']),'citations':[clean(c.get('plaintext_cite'+str(i) if i else 'plaintext_cite')) for i in range(5)],'count':len(vals)}
 metrics.append({'meta':meta,'data':enc(vals)})
print('cspp:',len(metrics),'state-year rows',row_count,'nonempty',sum(x['meta']['count'] for x in metrics))
with book.open(encoding='utf-8-sig',newline='') as f:
 ddbook={r['code_in_policies_dataset']:r for r in csv.DictReader(f) if clean(r['code_in_policies_dataset'])}
obs=collections.defaultdict(list);seen={};duplicates=0;first={}
with dynamic.open(encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f):
  var=r['variable']; key=(var,r['year'],r['state_abb']); vals=(clean(r['policy']),clean(r['policy_real']))
  if key in seen:
   if seen[key]!=vals: raise ValueError('conflicting duplicate '+str(key))
   duplicates+=1;continue
  seen[key]=vals;first.setdefault(var,r)
  if any(vals):obs[var].append([int(r['year']),r['state_abb'],*vals])
for var,vals in obs.items():
 c=ddbook.get(var,first[var]);srcs=[clean(c.get(k)) for k in ['main_source','secondary_source','third_source','fourth_source','fifth_source','sixth_source']]
 meta={'id':ident('dynamic',var),'dataset':'dynamic','variable':var,'title':clean(c.get('policy_short_description')) or var,'years':clean(c.get('date_range_of_available_data')),'category':'State policies','description':clean(c.get('policy_longer_description')),'sources':'\n'.join(s for s in srcs if s),'citations':[],'notes':clean(c.get('notes')),'count':len(vals)}
 metrics.append({'meta':meta,'data':enc(vals)})
print('dynamic:',len(obs),'duplicates removed',duplicates,'observations',sum(len(v) for v in obs.values()),'with codebook',sum(v in ddbook for v in obs))
with output.open('w',encoding='utf-8',newline='\n') as f:
 for m in metrics:f.write(json.dumps(m,ensure_ascii=False,separators=(',',':'))+'\n')
print('staging bytes:',output.stat().st_size,'largest document bytes:',max(len(json.dumps(x,ensure_ascii=False).encode()) for x in metrics))
