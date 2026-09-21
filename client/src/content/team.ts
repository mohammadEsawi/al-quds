import { L } from '@/i18n/types';
import type { TeamMember } from './types';

/**
 * Board of directors and executive management. Photos are added from the dashboard (الإدارة → choose a person → photo),
 * so `photo` is empty here. English texts are translations of the Arabic and can be edited in the dashboard too.
 * The chairman's and the general manager's messages are stored as text; paragraphs are separated by a blank line.
 */
export const team: TeamMember[] = [
  // ───────── Board of directors ─────────
  {
    id: 'chairman',
    group: 'board',
    role: 'chairman',
    name: L('رامي أسعد عيساوي', 'Rami Asaad Esawi'),
    title: L('رئيس مجلس الإدارة', 'Chairman of the Board'),
    bio: [
      L(
        'يشغل السيد رامي أسعد عيساوي منصب رئيس مجلس إدارة الشركة، حيث يتولى الإشراف على التوجهات العامة للشركة ومتابعة أعمال مجلس الإدارة، والمساهمة في وضع الخطط والاستراتيجيات التي تدعم نمو الشركة وتطوير استثماراتها.',
        'Mr. Rami Asaad Esawi serves as Chairman of the Board of Directors, overseeing the company’s general direction, following the work of the Board, and contributing to the plans and strategies that support the company’s growth and the development of its investments.',
      ),
      L(
        'يحمل السيد عيساوي درجة البكالوريوس في الإدارة، ودرجة الماجستير في إدارة الأعمال، كما يحمل مؤهل محاسب قانوني ومدقق حسابات.',
        'Mr. Esawi holds a Bachelor’s degree in Management and a Master’s degree in Business Administration, and is a certified public accountant and auditor.',
      ),
      L(
        'ويمتلك خبرة عملية تزيد عن 25 عامًا في مجالات المشتريات والاستثمار والإدارة، اكتسب خلالها خبرة واسعة في إدارة العمليات واتخاذ القرارات الإدارية والمالية وتطوير الأعمال والاستثمارات.',
        'He has more than 25 years of practical experience in procurement, investment and management, during which he gained broad experience in managing operations, making administrative and financial decisions, and developing businesses and investments.',
      ),
    ],
    // Paragraphs are separated by a blank line.
    message: L(
      [
        'في لاميكو للاستثمار الصناعي والتوريدات، ننظر إلى الاستثمار بوصفه مسؤولية وفرصة لبناء قيمة مستدامة، ونؤمن بأن النجاح الحقيقي يقوم على وضوح الرؤية، وقوة الإدارة، والقدرة على مواكبة متغيرات الأسواق.',
        'نعمل على ترسيخ مكانة الشركة وتطوير استثماراتها، من خلال التوسع المدروس، وتعزيز الشراكات، والالتزام بأعلى مستويات المهنية والجودة، بما يحقق قيمة مستدامة لعملائنا وشركائنا ومساهمينا.',
        'وستواصل لاميكو مسيرتها نحو بناء منظومة استثمارية وصناعية متكاملة، تستند إلى الخبرة والكفاءة، وتواكب فرص النمو، وتسهم في دعم الاقتصاد الوطني.',
      ].join('\n\n'),
      [
        'At Lamico for Industrial Investment and Supplies, we see investment as both a responsibility and an opportunity to build lasting value. We believe that real success rests on a clear vision, strong management, and the ability to keep pace with changing markets.',
        'We work to strengthen the company’s standing and develop its investments through measured expansion, stronger partnerships, and a commitment to the highest levels of professionalism and quality, delivering lasting value for our customers, partners and shareholders.',
        'Lamico will continue its journey toward building an integrated industrial and investment system, grounded in experience and competence, keeping pace with growth opportunities, and contributing to supporting the national economy.',
      ].join('\n\n'),
    ),
  },

  // ───────── Executive management ─────────
  {
    id: 'general-manager',
    group: 'executive',
    role: 'general_manager',
    name: L('لامي أسعد عيساوي', 'Lami Asaad Esawi'),
    title: L('المدير العام', 'General Manager'),
    department: L('الإدارة العامة', 'General Management'),
    bio: [
      L(
        'يشغل السيد لامي أسعد عيساوي دورًا إداريًا في الشركة، حيث يتولى الإشراف العام على أعمال الشركة ومتابعة الشؤون المالية والإدارية، بما يساهم في تنظيم العمليات وتعزيز الأداء والتنسيق بين مختلف الأقسام.',
        'Mr. Lami Asaad Esawi holds an executive role at the company, where he oversees the company’s overall business and follows up on financial and administrative affairs, contributing to organizing operations and strengthening performance and coordination between the different departments.',
      ),
      L(
        'يحمل السيد عيساوي درجة البكالوريوس في المحاسبة من جامعة النجاح الوطنية، إلى جانب درجة الماجستير في إدارة الأعمال، ودرجة الماجستير في القانون والاقتصاد من جامعة بيرزيت.',
        'Mr. Esawi holds a Bachelor’s degree in Accounting from An-Najah National University, in addition to a Master’s degree in Business Administration and a Master’s degree in Law and Economics from Birzeit University.',
      ),
      L(
        'ويمتلك السيد عيساوي خبرة عملية تزيد عن 20 عامًا في مجال الإدارة، اكتسب خلالها خبرة واسعة في الإشراف الإداري والمالي، ومتابعة الأداء، والتنسيق بين مختلف أقسام الشركة.',
        'Mr. Esawi has more than 20 years of practical experience in management, during which he gained broad experience in administrative and financial supervision, performance follow-up, and coordination between the company’s departments.',
      ),
    ],
    message: L(
      [
        'نؤمن في لاميكو للاستثمار الصناعي والتوريدات بأن التميز لا يتحقق بالنتائج وحدها، بل بمنظومة متكاملة من الكفاءة، والجودة، والابتكار، والالتزام.',
        'ومن هذا المنطلق، نعمل على تطوير أعمال الشركة وتعزيز كفاءة عملياتها، وتوسيع نطاق استثماراتها، وبناء علاقات استراتيجية راسخة مع العملاء والشركاء والموردين.',
        'إن رؤيتنا للمستقبل تقوم على النمو المستدام، والتطوير المستمر، والاستثمار في الإنسان والموارد والإمكانات، بما يعزز قدرة لاميكو على المنافسة ويفتح آفاقًا جديدة للنمو والتوسع.',
      ].join('\n\n'),
      [
        'At Lamico for Industrial Investment and Supplies, we believe that excellence is not achieved through results alone, but through an integrated system of efficiency, quality, innovation and commitment.',
        'From this standpoint, we work to develop the company’s business, improve the efficiency of its operations, expand the scope of its investments, and build strong strategic relationships with customers, partners and suppliers.',
        'Our vision for the future rests on sustainable growth, continuous development, and investing in people, resources and capabilities, strengthening Lamico’s ability to compete and opening new horizons for growth and expansion.',
      ].join('\n\n'),
    ),
  },
  {
    id: 'sales-manager',
    group: 'executive',
    role: 'member',
    name: L('السيد سعد مراد عيساوي', 'Mr. Saad Murad Esawi'),
    title: L('مدير المبيعات', 'Sales Manager'),
    bio: [
      L(
        'يتولى السيد سعد مراد عيساوي الإشراف على قسم المبيعات، وإدارة ومتابعة أداء فريق المبيعات، والعمل على تحقيق الأهداف البيعية وتعزيز كفاءة العمليات البيعية.',
        'Mr. Saad Murad Esawi oversees the sales department, manages and follows up on the sales team’s performance, and works to achieve sales targets and improve the efficiency of sales operations.',
      ),
      L(
        'كما يعمل على تطوير قاعدة العملاء، وبناء علاقات مستدامة معهم، ومتابعة احتياجات الأسواق، بما يسهم في تعزيز حضور الشركة وتوسيع انتشار منتجاتها في الأسواق.',
        'He also works on developing the customer base, building lasting relationships with customers, and following market needs, contributing to strengthening the company’s presence and expanding the reach of its products in the markets.',
      ),
      L(
        'يحمل السيد عيساوي درجة البكالوريوس في التسويق من جامعة القدس المفتوحة، ويتمتع بخبرة في مجال المبيعات والتسويق، وإدارة ومتابعة فرق المبيعات وتطوير علاقات العملاء.',
        'Mr. Esawi holds a Bachelor’s degree in Marketing from Al-Quds Open University and has experience in sales and marketing, managing and following up sales teams, and developing customer relationships.',
      ),
    ],
  },
  {
    id: 'pr-hr-manager',
    group: 'executive',
    role: 'member',
    name: L('المهندسة هلا هشام عيساوي', 'Ms. Hala Hisham Esawi'),
    title: L('مديرة العلاقات العامة والموارد البشرية', 'Public Relations and Human Resources Manager'),
    bio: [
      L(
        'تتولى المهندسة هلا هشام عيساوي إدارة العلاقات العامة وشؤون الموارد البشرية في الشركة، حيث تعمل على تنظيم ومتابعة شؤون الموظفين، وتعزيز بيئة العمل والتواصل الداخلي، إلى جانب الإشراف على أنشطة العلاقات العامة والتواصل مع مختلف الجهات ذات العلاقة.',
        'Eng. Hala Hisham Esawi manages public relations and human resources at the company, organizing and following up on employee affairs, strengthening the work environment and internal communication, and supervising public relations activities and communication with the various relevant parties.',
      ),
      L(
        'تحمل السيدة عيساوي درجة البكالوريوس في هندسة الاتصالات من جامعة النجاح الوطنية، وتساهم من خلال مهامها الإدارية في دعم العمليات التنظيمية وتعزيز التواصل والتنسيق داخل الشركة.',
        'Ms. Esawi holds a Bachelor’s degree in Communications Engineering from An-Najah National University, and through her administrative duties contributes to supporting organizational processes and strengthening communication and coordination within the company.',
      ),
    ],
  },
  {
    id: 'operations-manager',
    group: 'executive',
    role: 'member',
    name: L('المهندس وسيم عثمان شنابلي', 'Mr. Waseem Othman Shnabli'),
    title: L('مدير العمليات', 'Operations Manager'),
    bio: [
      L(
        'يتولى المهندس وسيم عثمان شنابلي إدارة العمليات التشغيلية في الشركة، حيث يشرف على سير الأعمال ومتابعة الأداء العام للعمليات، والعمل على ضمان كفاءة وانتظام سير العمل بين مختلف الأقسام.',
        'Eng. Waseem Othman Shnabli manages the company’s operations, overseeing the flow of work and the overall performance of operations, and working to ensure the efficiency and regularity of work across the different departments.',
      ),
      L(
        'كما يعمل على متابعة العمليات اليومية والتنسيق بين الفرق والأقسام ذات العلاقة، بما يسهم في تحسين الأداء التشغيلي ودعم أهداف الشركة.',
        'He also follows up on daily operations and coordinates between the relevant teams and departments, contributing to improving operational performance and supporting the company’s goals.',
      ),
      L(
        'يحمل السيد شنابلي درجة البكالوريوس في هندسة الكهرباء من جامعة النجاح الوطنية.',
        'Mr. Shnabli holds a Bachelor’s degree in Electrical Engineering from An-Najah National University.',
      ),
    ],
  },
  {
    id: 'development-manager',
    group: 'executive',
    role: 'member',
    name: L('الدكتور عمر رامي عيساوي', 'Dr. Omar Rami Esawi'),
    title: L('مدير التطوير', 'Development Manager'),
    bio: [
      L(
        'يتولى الدكتور عمر رامي عيساوي مهام التطوير في الشركة، حيث يعمل على متابعة فرص النمو والتوسع، ودراسة المبادرات والمجالات التي من شأنها دعم تطور أعمال الشركة وتعزيز حضورها في الأسواق.',
        'Dr. Omar Rami Esawi handles development at the company, following up on growth and expansion opportunities and studying initiatives and areas that would support the development of the company’s business and strengthen its presence in the markets.',
      ),
      L(
        'كما يساهم في متابعة مشاريع التطوير والتنسيق بشأن المبادرات المستقبلية، بما يدعم توجهات الشركة وخططها للنمو والتوسع.',
        'He also contributes to following up on development projects and coordinating future initiatives, supporting the company’s directions and its plans for growth and expansion.',
      ),
      L(
        'يحمل الدكتور عيساوي درجة البكالوريوس في الطب البشري من جامعة النجاح الوطنية.',
        'Dr. Esawi holds a Bachelor’s degree in Human Medicine from An-Najah National University.',
      ),
    ],
  },
  {
    id: 'supply-manager',
    group: 'executive',
    role: 'member',
    name: L('المهندس محمد مراد عيساوي', 'Mr. Mohammad Murad Esawi'),
    title: L('مدير التوريدات', 'Supply Manager'),
    bio: [
      L(
        'يتولى المهندس محمد مراد عيساوي إدارة ومتابعة عمليات التوريدات في الشركة، والعمل على تنسيق ومتابعة احتياجات الشركة من المواد والمستلزمات، بما يساهم في ضمان استمرارية العمليات وكفاءة سير العمل.',
        'Eng. Mohammad Murad Esawi manages and follows up on the company’s supply operations, coordinating and following up on the company’s needs for materials and supplies, contributing to ensuring the continuity of operations and the efficiency of work.',
      ),
      L(
        'كما يعمل على متابعة عمليات الشراء والتوريد والتنسيق مع الجهات والموردين ذوي العلاقة، بما يدعم احتياجات مختلف أقسام الشركة.',
        'He also follows up on purchasing and supply processes and coordinates with the relevant parties and suppliers, supporting the needs of the company’s various departments.',
      ),
      L(
        'يحمل السيد عيساوي درجة البكالوريوس في هندسة الحاسوب من جامعة النجاح الوطنية.',
        'Mr. Esawi holds a Bachelor’s degree in Computer Engineering from An-Najah National University.',
      ),
    ],
  },
  {
    id: 'quality-manager',
    group: 'executive',
    role: 'member',
    name: L('المهندسة هيا هشام عيساوي', 'Eng. Haya Hisham Esawi'),
    title: L('مديرة دائرة الجودة', 'Quality Department Manager'),
    bio: [
      L(
        'تتولى المهندسة هيا هشام عيساوي إدارة دائرة الجودة، والإشراف على تطبيق معايير الجودة ومتابعة الالتزام بالمتطلبات والمعايير المعتمدة في عمليات الشركة.',
        'Eng. Haya Hisham Esawi manages the Quality Department, overseeing the application of quality standards and following up on compliance with the approved requirements and standards in the company’s operations.',
      ),
      L(
        'تحمل درجة البكالوريوس في الهندسة الكيميائية من جامعة النجاح الوطنية.',
        'She holds a Bachelor’s degree in Chemical Engineering from An-Najah National University.',
      ),
    ],
  },
  {
    id: 'accounts-manager',
    group: 'executive',
    role: 'member',
    name: L('السيد أمير عباس عيساوي', 'Mr. Amir Abbas Esawi'),
    title: L('مدير الحسابات', 'Accounts Manager'),
    bio: [
      L(
        'يتولى السيد أمير عباس عيساوي إدارة الحسابات والإشراف على الأعمال المحاسبية والمالية، ومتابعة العمليات المالية بما يضمن دقة وسلامة الإجراءات المحاسبية في الشركة.',
        'Mr. Amir Abbas Esawi manages the accounts and oversees the accounting and financial work, following up on financial operations to ensure the accuracy and soundness of the company’s accounting procedures.',
      ),
      L(
        'يحمل درجة البكالوريوس في المحاسبة من جامعة النجاح الوطنية، ودرجة الماجستير في المحاسبة.',
        'He holds a Bachelor’s degree in Accounting from An-Najah National University and a Master’s degree in Accounting.',
      ),
    ],
  },
];
