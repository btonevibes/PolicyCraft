"""Download current source files for a scheduled, validated research refresh."""
import csv
import hashlib
import pathlib
import re
import sys
import urllib.parse
import urllib.request
from playwright.sync_api import sync_playwright

out = pathlib.Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
source = 'https://ippsr.msu.edu/public-policy/correlates-state-policy'
with urllib.request.urlopen(source, timeout=60) as response:
    html = response.read().decode('utf-8', 'replace')
links = re.findall(r'href=["\']([^"\']+)["\']', html, re.I)
versions = []
for link in links:
    match = re.search(r'/correlates(\d+)-(\d+)\.csv$', link, re.I)
    if match:
        versions.append(((int(match[1]), int(match[2])), link))
if not versions:
    raise RuntimeError('Could not find a versioned Correlates CSV.')
version, data_link = max(versions)
book_link = next((link for link in links if re.search(rf'/codebook_{version[0]}-{version[1]}\.csv$', link, re.I)), None)
if not book_link:
    raise RuntimeError('A matching Correlates codebook was not found.')
for name, link in [('cspp.csv', data_link), ('cspp-codebook.csv', book_link)]:
    url = urllib.parse.urljoin(source, link)
    with urllib.request.urlopen(url, timeout=180) as response, (out / name).open('wb') as stream:
        while chunk := response.read(1024 * 1024):
            stream.write(chunk)

def columns(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return next(csv.reader(stream))

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.set_default_timeout(60000)
        page.goto('https://dynamicdemocracy.shinyapps.io/ShinyApp/', wait_until='domcontentloaded', timeout=120000)
        nav = page.get_by_role('tab', name='Download Data', exact=True)
        try:
            nav.wait_for(state='visible', timeout=90000)
        except Exception:
            page.get_by_role('button', name='Toggle navigation').click()
        nav.click()
        def choose_dataset(name):
            page.get_by_role('combobox', name='Select Dataset:').click()
            page.get_by_role('option', name=name, exact=True).click()
        def choose_type(name, input_id):
            current = page.locator(f'#{input_id}').locator('..').locator('.item').inner_text()
            before = page.locator('.dataTables_scrollBody table tbody').inner_text()
            page.get_by_role('combobox', name='Select Liberalism Type:').click()
            page.get_by_role('option', name=name, exact=True).click()
            if current != name:
                page.wait_for_function("before => { const b = document.querySelector('.dataTables_scrollBody table tbody'); return b && b.querySelectorAll('tr').length > 0 && b.innerText !== before; }", arg=before, timeout=60000)
            page.get_by_role('combobox', name='Show entries').select_option('100')
            page.wait_for_function("document.querySelectorAll('.dataTables_scrollBody table tbody tr').length >= 90")
        def save(name, required):
            page.wait_for_timeout(2500)
            with page.expect_download(timeout=180000) as event:
                page.get_by_role('link', name=re.compile('Download Entire Dataset')).click()
            event.value.save_as(str(out / name))
            if not set(required).issubset(columns(out / name)):
                raise RuntimeError(f'Unexpected columns in {name}.')
        for choice, name, required in [
            ('Policy Codebook','policy_codebook.csv',['code_in_policies_dataset']),
            ('State Policies','state_policies.csv',['variable','year','state_abb','policy','policy_real']),
            ('Public Opinion','opinion.csv',['policy','state_name','year','opinion','issue']),
            ('Policy Proximity','proximity.csv',['policy','state_name','year','proximity'])
        ]:
            choose_dataset(choice)
            save(name, required)
        def check_ideology_table(filename):
            csv_rows = {}
            with (out / filename).open(encoding='utf-8-sig', newline='') as stream:
                for row in csv.DictReader(stream):
                    csv_rows[(row['state_abb'], row['year'])] = row['median']
            checks = 0
            for row in page.locator('.dataTables_scrollBody table tbody tr').all():
                cells = row.locator('td').all_text_contents()
                if len(cells) < 4 or not cells[3].strip():
                    continue
                value = csv_rows.get((cells[0].strip(), cells[2].strip()))
                if not value or abs(float(value)-float(cells[3].strip())) > 1e-8:
                    raise RuntimeError(f'{filename} does not match the selected table.')
                checks += 1
                if checks == 5:
                    break
            if checks < 5:
                raise RuntimeError(f'Could not confirm selected ideology type for {filename}.')
        choose_dataset('State Policy Ideology')
        page.get_by_role('combobox', name='Select Liberalism Type:').wait_for(state='visible')
        page.wait_for_function("() => { const h = document.querySelector('.dataTables_scrollHead'); return h && h.innerText.includes('median') && h.innerText.includes('lower'); }")
        page.get_by_role('combobox', name='Show entries').select_option('100')
        page.wait_for_function("document.querySelectorAll('.dataTables_scrollBody table tbody tr').length >= 90")
        for option, name in [('Constant','policy_constant.csv'),('Evolving','policy_evolving.csv'),('Cultural','policy_cultural.csv'),('Economic','policy_economic.csv')]:
            choose_type(option, 'liberalism_type-selectized')
            save(name, ['state_abb','year','median','lower','upper'])
            check_ideology_table(name)
        choose_dataset('Mass Ideology')
        page.get_by_role('combobox', name='Select Liberalism Type:').wait_for(state='visible')
        page.wait_for_function("() => { const h = document.querySelector('.dataTables_scrollHead'); return h && h.innerText.includes('median') && !h.innerText.includes('lower'); }")
        page.get_by_role('combobox', name='Show entries').select_option('100')
        page.wait_for_function("document.querySelectorAll('.dataTables_scrollBody table tbody tr').length >= 90")
        for option, name in [('Cultural','mass_cultural.csv'),('Economic','mass_economic.csv')]:
            choose_type(option, 'mass_liberalism_type-selectized')
            save(name, ['state_abb','year','median','sd'])
            check_ideology_table(name)
    finally:
        browser.close()
for group in [('policy_constant.csv','policy_evolving.csv','policy_cultural.csv','policy_economic.csv'),('mass_cultural.csv','mass_economic.csv')]:
    hashes = [hashlib.sha256((out / name).read_bytes()).hexdigest() for name in group]
    if len(hashes) != len(set(hashes)):
        raise RuntimeError('Ideology downloads matched; refusing to guess their type.')
print(f'Downloaded Correlates {version[0]}.{version[1]} and Dynamic Democracy data.')
