import { L } from '@/i18n/types';
import type { LegalDocument } from './types';

export const privacyPolicy: LegalDocument = {
  updated: L('يناير 2026', 'January 2026'),
  sections: [
    {
      heading: L('مقدمة', 'Introduction'),
      paragraphs: [
        L(
          'نحن في لاميكو الاستثمارية نلتزم بحماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة كيف نجمع ونستخدم ونحمي المعلومات التي تقدمها لنا عند استخدام موقعنا الإلكتروني أو التواصل معنا.',
          'At Lamico Investment we are committed to protecting your privacy and personal data. This policy explains how we collect, use and protect the information you provide when using our website or contacting us.',
        ),
      ],
    },
    {
      heading: L('المعلومات التي نجمعها', 'Information we collect'),
      paragraphs: [L('نجمع المعلومات التي تقدمها لنا طوعاً عند:', 'We collect the information you give us voluntarily when you:')],
      items: [
        L('ملء نموذج التواصل على موقعنا (الاسم، البريد الإلكتروني، رقم الهاتف، الرسالة)', 'Fill in the contact form on our website (name, email, phone number, message)'),
        L('التقدم لإحدى الوظائف وإرفاق السيرة الذاتية والبيانات المهنية', 'Apply for a job and attach your CV and professional details'),
        L('التواصل معنا عبر البريد الإلكتروني أو الهاتف أو واتساب', 'Contact us by email, phone or WhatsApp'),
        L('طلب معلومات حول منتجاتنا أو خدماتنا', 'Request information about our products or services'),
      ],
    },
    {
      heading: L('كيف نستخدم معلوماتك', 'How we use your information'),
      paragraphs: [L('نستخدم المعلومات التي نجمعها لـ:', 'We use the information we collect to:')],
      items: [
        L('الرد على استفساراتك ورسائلك', 'Reply to your inquiries and messages'),
        L('دراسة طلبات التوظيف والتواصل مع المتقدمين', 'Review job applications and get in touch with applicants'),
        L('تقديم معلومات حول منتجاتنا وخدماتنا', 'Provide information about our products and services'),
        L('تحسين تجربة استخدام موقعنا', 'Improve your experience on our website'),
        L('الامتثال للمتطلبات القانونية', 'Comply with legal requirements'),
      ],
    },
    {
      heading: L('بيانات طلبات التوظيف', 'Job application data'),
      paragraphs: [
        L(
          'تُعامل السير الذاتية وبيانات المتقدمين للوظائف على أنها بيانات خاصة، ولا يطّلع عليها إلا الفريق المسؤول عن التوظيف، ولا تُستخدم لأي غرض آخر.',
          'CVs and applicant data are treated as private. Only the hiring team can see them and they are not used for any other purpose.',
        ),
      ],
    },
    {
      heading: L('حماية معلوماتك', 'Protecting your information'),
      paragraphs: [
        L(
          'نتخذ إجراءات أمنية مناسبة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التغيير أو الإفصاح أو الإتلاف. لا نبيع أو نؤجر أو نشارك معلوماتك الشخصية مع أطراف ثالثة لأغراض تسويقية.',
          'We take appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure or destruction. We do not sell, rent or share your personal information with third parties for marketing purposes.',
        ),
      ],
    },
    {
      heading: L('ملفات تعريف الارتباط (Cookies)', 'Cookies'),
      paragraphs: [
        L(
          'قد يستخدم موقعنا ملفات تعريف الارتباط وتخزيناً محلياً لتحسين تجربة التصفح وتذكّر تفضيلاتك مثل اللغة. يمكنك التحكم في هذه الإعدادات من خلال متصفحك.',
          'Our website may use cookies and local storage to improve browsing and remember your preferences such as language. You can control these settings through your browser.',
        ),
      ],
    },
    {
      heading: L('حقوقك', 'Your rights'),
      paragraphs: [L('يحق لك:', 'You have the right to:')],
      items: [
        L('طلب الوصول إلى بياناتك الشخصية', 'Request access to your personal data'),
        L('طلب تصحيح أو حذف بياناتك', 'Request correction or deletion of your data'),
        L('الاعتراض على معالجة بياناتك', 'Object to the processing of your data'),
        L('سحب موافقتك في أي وقت', 'Withdraw your consent at any time'),
      ],
    },
  ],
};

export const termsOfUse: LegalDocument = {
  updated: L('يناير 2026', 'January 2026'),
  sections: [
    {
      heading: L('القبول بالشروط', 'Acceptance of terms'),
      paragraphs: [
        L(
          'باستخدامك لموقع لاميكو الاستثمارية الإلكتروني، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام الموقع.',
          'By using the Lamico Investment website you agree to be bound by these terms and conditions. If you do not agree with any of them, please do not use the website.',
        ),
      ],
    },
    {
      heading: L('استخدام الموقع', 'Use of the website'),
      paragraphs: [L('يُسمح لك باستخدام هذا الموقع للأغراض المشروعة فقط. يُحظر عليك:', 'You may use this website for lawful purposes only. You must not:')],
      items: [
        L('استخدام الموقع بطريقة تنتهك أي قانون أو لائحة محلية أو دولية', 'Use the website in a way that violates any local or international law or regulation'),
        L('نسخ أو توزيع أو تعديل أي محتوى من الموقع دون إذن مسبق', 'Copy, distribute or modify any content of the website without prior permission'),
        L('محاولة الوصول غير المصرح به إلى أنظمة الموقع', 'Attempt unauthorized access to the website systems'),
        L('استخدام الموقع لأغراض تجارية غير مصرح بها', 'Use the website for unauthorized commercial purposes'),
      ],
    },
    {
      heading: L('الملكية الفكرية', 'Intellectual property'),
      paragraphs: [
        L(
          'جميع المحتويات المعروضة على هذا الموقع — بما في ذلك النصوص والصور والشعارات والتصاميم والعلامات التجارية — هي ملكية حصرية لشركة لاميكو الاستثمارية ومحمية بموجب قوانين الملكية الفكرية. لا يجوز استخدام أي من هذه المحتويات دون إذن خطي مسبق.',
          'All content displayed on this website — including text, images, logos, designs and trademarks — is the exclusive property of Lamico Investment Company and is protected by intellectual property laws. None of it may be used without prior written permission.',
        ),
      ],
    },
    {
      heading: L('المنتجات والخدمات', 'Products and services'),
      paragraphs: [
        L(
          'المعلومات المعروضة على الموقع حول منتجاتنا وخدماتنا هي لأغراض إعلامية فقط. نحتفظ بالحق في تعديل أو تحديث معلومات المنتجات في أي وقت دون إشعار مسبق. الصور المعروضة قد تختلف قليلاً عن المنتج الفعلي.',
          'The information on the website about our products and services is for informational purposes only. We reserve the right to change or update product information at any time without prior notice. Images shown may differ slightly from the actual product.',
        ),
      ],
    },
    {
      heading: L('إخلاء المسؤولية', 'Disclaimer'),
      paragraphs: [
        L(
          'يُقدم هذا الموقع "كما هو" دون أي ضمانات صريحة أو ضمنية. لا نتحمل المسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام الموقع أو عدم القدرة على استخدامه.',
          'This website is provided "as is" without any express or implied warranties. We are not liable for any direct or indirect damages arising from the use of, or inability to use, the website.',
        ),
      ],
    },
    {
      heading: L('الروابط الخارجية', 'External links'),
      paragraphs: [
        L(
          'قد يحتوي الموقع على روابط لمواقع خارجية. لا نتحمل أي مسؤولية عن محتوى أو سياسات الخصوصية الخاصة بهذه المواقع.',
          'The website may contain links to external websites. We accept no responsibility for the content or privacy policies of those websites.',
        ),
      ],
    },
    {
      heading: L('التعديلات على الشروط', 'Changes to the terms'),
      paragraphs: [
        L(
          'نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم نشر أي تعديلات على هذه الصفحة مع تحديث تاريخ آخر تعديل. استمرارك في استخدام الموقع بعد نشر التعديلات يعني موافقتك على الشروط المعدلة.',
          'We reserve the right to change these terms at any time. Any changes will be posted on this page with an updated date. Continuing to use the website after changes are posted means you accept the revised terms.',
        ),
      ],
    },
    {
      heading: L('القانون المطبق', 'Governing law'),
      paragraphs: [
        L(
          'تخضع هذه الشروط وتُفسر وفقاً للقوانين المعمول بها في فلسطين. أي نزاع ينشأ عن استخدام هذا الموقع يخضع للاختصاص القضائي للمحاكم المختصة في فلسطين.',
          'These terms are governed by and interpreted under the laws in force in Palestine. Any dispute arising from the use of this website falls under the jurisdiction of the competent courts in Palestine.',
        ),
      ],
    },
  ],
};
