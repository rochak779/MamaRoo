-- English rows reproduce the designer mock (Screens/06-Me/Pregnancy Preparation.dc.html)
-- verbatim. Hindi rows are temporary translations, same caveat as
-- food_safety.placeholder.sql -- replace with reviewed copy before production use.

insert into public.checklist_items (item_key, locale, category, label, sort_order)
values
  ('me-clothes', 'en', 'me', 'Comfortable clothes and nightwear', 10),
  ('me-toiletries', 'en', 'me', 'Toiletries and sanitary pads', 20),
  ('me-charger', 'en', 'me', 'Phone charger', 30),
  ('me-snacks', 'en', 'me', 'Snacks for after', 40),
  ('baby-outfit', 'en', 'baby', 'Going home outfit', 10),
  ('baby-diapers', 'en', 'baby', 'Diapers and wipes', 20),
  ('baby-swaddle', 'en', 'baby', 'Swaddle or blanket', 30),
  ('docs-id', 'en', 'docs', 'Aadhaar or other ID', 10),
  ('docs-insurance', 'en', 'docs', 'Insurance or health card', 20),
  ('docs-reports', 'en', 'docs', 'Previous checkup reports', 30),

  ('me-clothes', 'hi', 'me', 'आरामदायक कपड़े और नाइटवियर', 10),
  ('me-toiletries', 'hi', 'me', 'टॉयलेटरीज़ और सैनिटरी पैड', 20),
  ('me-charger', 'hi', 'me', 'फ़ोन चार्जर', 30),
  ('me-snacks', 'hi', 'me', 'बाद के लिए नाश्ता', 40),
  ('baby-outfit', 'hi', 'baby', 'घर ले जाने के लिए कपड़े', 10),
  ('baby-diapers', 'hi', 'baby', 'डायपर और वाइप्स', 20),
  ('baby-swaddle', 'hi', 'baby', 'स्वैडल या कंबल', 30),
  ('docs-id', 'hi', 'docs', 'आधार या अन्य पहचान पत्र', 10),
  ('docs-insurance', 'hi', 'docs', 'बीमा या स्वास्थ्य कार्ड', 20),
  ('docs-reports', 'hi', 'docs', 'पिछली जांच रिपोर्ट', 30);
