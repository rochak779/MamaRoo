-- PLACEHOLDER MEDICAL AND BENEFITS CONTENT. Replace with reviewed copy before production use.
-- English rows reproduce the designer mock verbatim; Hindi rows are temporary translations.
-- One exception: the mock's fifth FAQ, about whether bump shape reveals a detail about
-- the baby that Indian law (the PCPNDT Act) prohibits sharing, is deliberately dropped.
-- tests/guards/schema-pcpndt.test.ts forbids every shipped file from naming that detail at
-- all (spec Section 1.4), with zero exception for myth-correcting content -- the guard can't
-- tell a corrective answer from a disclosure, and the Act's own enforcement doesn't reward
-- that distinction either. Four FAQs ship instead of the mock's five.

insert into public.guide_faqs
  (locale, question, answer, sort_order)
values
  ('en', 'Can I eat fruit at night',
   'Yes, fruit at any time of day is fine during pregnancy. There is no rule that it needs to be avoided in the evening, so eat it whenever it suits you.', 10),
  ('en', 'Do I need to avoid all exercise',
   'Gentle movement is usually encouraged, not avoided. Walking, light yoga and stretching are commonly recommended, unless your doctor has told you otherwise for your specific pregnancy.', 20),
  ('en', 'Will an oil massage harm my baby',
   'A gentle oil massage from a trained person is generally considered safe and can ease aches. Just avoid deep pressure on your belly and check with your doctor if you have any complications.', 30),
  ('en', 'Can I sleep on my back',
   'Sleeping on your side, especially the left, is generally more comfortable and recommended from the second trimester onward. If you wake up on your back, that is normal too, just shift back to your side.', 40),
  ('hi', 'क्या मैं रात में फल खा सकती हूँ',
   'हाँ, गर्भावस्था में दिन के किसी भी समय फल खाना ठीक है। शाम को फल न खाने का कोई नियम नहीं है, इसलिए जब आपको सुविधाजनक लगे तब खाएँ।', 10),
  ('hi', 'क्या मुझे हर तरह के व्यायाम से बचना चाहिए',
   'हल्की गतिविधि से बचने के बजाय आम तौर पर उसे करने की सलाह दी जाती है। चलना, हल्का योग और स्ट्रेचिंग सामान्य सुझाव हैं, जब तक डॉक्टर ने आपकी गर्भावस्था के लिए कुछ और न कहा हो।', 20),
  ('hi', 'क्या तेल की मालिश से मेरे बच्चे को नुकसान होगा',
   'प्रशिक्षित व्यक्ति से हल्की तेल मालिश आम तौर पर सुरक्षित मानी जाती है और दर्द कम कर सकती है। पेट पर गहरा दबाव न डालें और कोई जटिलता हो तो डॉक्टर से पूछें।', 30),
  ('hi', 'क्या मैं पीठ के बल सो सकती हूँ',
   'दूसरी तिमाही से करवट लेकर, खासकर बाईं करवट, सोना आम तौर पर अधिक आरामदायक और सुझाया जाता है। अगर आप पीठ के बल जागें तो यह भी सामान्य है; बस फिर से करवट ले लें।', 40);

insert into public.guide_schemes
  (locale, name, short_text, long_text, sort_order)
values
  ('en', 'Pradhan Mantri Matru Vandana Yojana',
   'Cash support for your first living child, paid in installments.',
   'You can receive five thousand rupees in three installments during pregnancy and after delivery, once you complete the required checkups and registration steps. Ask your local health worker to help you register.', 10),
  ('en', 'Janani Suraksha Yojana',
   'Cash assistance for institutional delivery, mainly for those below the poverty line.',
   'This scheme supports safe delivery in a hospital or health centre rather than at home, with cash assistance that varies by state and whether you are in a rural or urban area.', 20),
  ('en', 'State health helpline',
   'A free number to call for pregnancy related questions and appointment help.',
   'Many states run a toll free maternal health helpline staffed by nurses who can answer questions and help you find your nearest government hospital or health centre.', 30),
  ('hi', 'Pradhan Mantri Matru Vandana Yojana',
   'आपके पहले जीवित बच्चे के लिए किस्तों में दी जाने वाली नकद सहायता।',
   'ज़रूरी जाँच और पंजीकरण के चरण पूरे करने पर गर्भावस्था और प्रसव के बाद आपको तीन किस्तों में पाँच हज़ार रुपये मिल सकते हैं। पंजीकरण में मदद के लिए अपने स्थानीय स्वास्थ्य कार्यकर्ता से पूछें।', 10),
  ('hi', 'Janani Suraksha Yojana',
   'संस्थागत प्रसव के लिए नकद सहायता, मुख्य रूप से गरीबी रेखा से नीचे के परिवारों के लिए।',
   'यह योजना घर के बजाय अस्पताल या स्वास्थ्य केंद्र में सुरक्षित प्रसव के लिए सहायता देती है। नकद राशि राज्य और ग्रामीण या शहरी क्षेत्र के अनुसार अलग हो सकती है।', 20),
  ('hi', 'राज्य स्वास्थ्य हेल्पलाइन',
   'गर्भावस्था से जुड़े सवालों और अपॉइंटमेंट में मदद के लिए मुफ़्त नंबर।',
   'कई राज्य नर्सों द्वारा संचालित टोल-फ़्री मातृ स्वास्थ्य हेल्पलाइन चलाते हैं। वे सवालों के जवाब दे सकती हैं और नज़दीकी सरकारी अस्पताल या स्वास्थ्य केंद्र ढूँढने में मदद कर सकती हैं।', 30);
