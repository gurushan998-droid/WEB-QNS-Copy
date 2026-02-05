import json

file_path = 'd:\\WEB_QNS_Copy\\data\\12botany.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

removed_count = 0

for chapter, sections in data.items():
    if 'mcq' in sections:
        for cat in ['bb', 'interior']:
            if cat in sections['mcq']:
                questions = sections['mcq'][cat]
                to_keep = []
                for q in questions:
                    is_match = False
                    if 'title' in q and 'match' in q['title'].lower():
                        is_match = True
                    if 'Column1' in q or 'List I' in q or 'columnA' in q:
                        is_match = True
                    
                    is_assertion = False
                    if 'Assertion' in q or 'assertion' in q:
                        is_assertion = True
                    
                    if not is_match and not is_assertion:
                        to_keep.append(q)
                    else:
                        removed_count += 1
                
                sections['mcq'][cat] = to_keep

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print(f"Removed {removed_count} Match/Assertion questions from mcq arrays.")
