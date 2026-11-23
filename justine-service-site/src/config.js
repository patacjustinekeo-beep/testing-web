// =====================================================================
//  EDIT THIS FILE: everything shown on the Webbins website lives here.
//  Photos go in  public/images/  (see IMAGES and WORKS below).
// =====================================================================

export const BRAND = {
  name: 'Webbins',
  tagline: 'Website Developer Service',
  line: 'Beautiful, fast websites for restaurants and businesses, built from first sketch to launch.',
};

export const OWNER = {
  // MUST match the email in firestore.rules. Lowercase only.
  email: 'patacjustinekeo@gmail.com',
  name: 'Justine Keo Patac',
  firstName: 'Justine',
  roles: ['Restaurant websites', 'Business websites', 'Web apps with login and chat'],
  intro: 'I am the developer and designer behind Webbins. I build websites that look great and bring in customers.',
  bio: [
    "Hi, I'm Justine, a website developer and graphic designer. I help restaurants, cafes and local businesses get a website that looks great and works for them: menus people can read, bookings and orders that are easy to make, and a brand that feels like theirs.",
    'Because I do both design and code, you talk to one person from the first sketch to the day your website goes live.',
  ],
};

// Where your photos go. The website shows a labeled box until the file exists.
export const IMAGES = {
  profile: '/images/profile.png',       // Meet me section + chat avatar (square photo of you)
  background: '/images/background.jpg', // Background section (photo about your story, 16:9)
  career: '/images/career.jpg',         // Career section (photo of you working, 16:9)
  license: '/images/license.jpg',       // License and trust section (photo of your license or certificate)
};

export const SERVICES = [
  { title: 'Restaurant websites', text: 'Menu, gallery, location, reservations and online ordering.' },
  { title: 'Business websites', text: 'Clear service pages, contact forms and a look that builds trust.' },
  { title: 'Web apps', text: 'Logins, dashboards and chat, like the one you are using now.' },
];

// Photos only. category must be one of: 'Restaurant', 'Business', 'Web App'
// Put each photo in public/images/ (screenshot of the finished website, about 1600x1000).
export const WORKS = [
  { title: 'Sunset Grill', category: 'Restaurant', image: '/images/work-1.jpg' },
  { title: 'Kape Corner', category: 'Restaurant', image: '/images/work-2.jpg' },
  { title: 'Bright Dental', category: 'Business', image: '/images/work-3.jpg' },
  { title: 'Island Realty', category: 'Business', image: '/images/work-4.jpg' },
  { title: 'Order Desk', category: 'Web App', image: '/images/work-5.jpg' },
  { title: 'Chat Support', category: 'Web App', image: '/images/work-6.jpg' },
];

export const SKILLS = [
  { name: 'HTML & CSS', level: 95 },
  { name: 'JavaScript', level: 85 },
  { name: 'Firebase', level: 80 },
  { name: 'UI design (Canva, Figma)', level: 90 },
  { name: 'Branding & graphics', level: 88 },
  { name: 'Photo & video editing', level: 82 },
];
export const TOOLS = ['HTML', 'CSS', 'JavaScript', 'Firebase', 'Vite', 'Canva', 'CapCut', 'Responsive design', 'SEO basics'];

// Sample packages and prices: change them to your real ones.
export const PACKS = [
  {
    name: 'Starter', price: '$150', pages: '1 page', delivery: 'About 3 to 5 days',
    best: 'Small shops, cafes and personal brands',
    summary: 'A clean one-page website that tells people who you are, what you offer and how to reach you.',
    pagesList: ['One long scrolling page with Home, About, Services or Menu highlights, and Contact'],
    features: ['Mobile-friendly design', 'Contact button, social media links and map', 'Basic search engine setup (SEO)', 'Free subdomain set up for you'],
  },
  {
    name: 'Business', price: '$350', pages: 'Up to 5 pages', delivery: 'About 1 to 2 weeks', popular: true,
    best: 'Restaurants, clinics, shops and small companies',
    summary: 'A complete small-business website with separate pages, so customers find what they need fast.',
    pagesList: ['Home', 'About', 'Menu or Services', 'Gallery', 'Contact'],
    features: ['Photo gallery and menu or service list', 'Contact form', 'Social media links and Google Maps', 'Search engine setup and Google Search Console'],
  },
  {
    name: 'Premium', price: '$700', pages: 'Up to 10 pages', delivery: 'About 2 to 4 weeks',
    best: 'Businesses that want customer logins, orders or bookings',
    summary: 'Everything in Business, plus web app features such as customer accounts and a dashboard.',
    pagesList: ['All Business pages', 'Extra pages like FAQ, Pricing, Blog or Team (up to 10 in total)'],
    features: ['Customer login and dashboard', 'Online booking or ordering form', 'Advanced search engine setup', 'Priority support'],
  },
];
export const PACK_NOTE = 'These are starting prices. The final price depends on what you want to create, so let us talk about it first.';

// Your numbers that are NOT from customer ratings on this site
export const STATS = { projectsDone: 25, extraSatisfied: 0 };

export const BACKGROUND = [
  { year: '2019', title: 'Started with design', text: 'Began with posters, ads and social media graphics using Canva.' },
  { year: '2021', title: 'Learned to code', text: 'Taught myself HTML, CSS and JavaScript to turn designs into real websites.' },
  { year: '2023', title: 'First restaurant client', text: 'Built my first full restaurant website and learned what owners really need.' },
];
export const CAREER = [
  { year: '2023', title: 'Freelance web developer', place: 'Self-employed', text: 'Websites for cafes, restaurants and small shops.' },
  { year: '2024', title: 'Web apps with Firebase', place: 'Self-employed', text: 'Added logins, dashboards and live chat to client websites.' },
  { year: '2026', title: 'Founded Webbins', place: 'Webbins', text: 'A website developer service that handles design, code and launch.' },
];

// The steps of working with you
export const PROCESS = [
  { title: 'Tell me your idea', text: 'Chat with me and tell me what you want to create. Together we pick the package that fits you.' },
  { title: 'I build it first', text: 'I make your website first, using my own account. You do not pay anything yet.' },
  { title: 'You review it', text: 'I show you the finished website in the chat. Tell me what you think.' },
  { title: 'You are satisfied, then payment', text: 'Only when you are happy with the website do we move on to payment. Talk to me about the payment method.' },
  { title: 'Ownership is transferred', text: 'You give me your email address for ownership. I use it to give the website ownership to you.' },
  { title: 'Secure your account', text: 'When everything is done, change your email password. I can help you if you need it.' },
];
export const REMINDERS = [
  {
    important: true, tag: 'Important reminder',
    title: 'Prepare an email address for website ownership',
    text: 'You need to give me an email address for the ownership of your website. A business email address is best. I will need that email address after I finish making your website, and I will ask you to grant me access to it. Do not worry: I only use it to give the website ownership to you. After the process is done, you can change that email\'s password. If you need help changing your password, I can help you with it.',
  },
  {
    tag: 'Good to know',
    title: 'I use free subdomains',
    text: 'My websites run on free subdomains. A free subdomain has a limit on how many people can request your website at the same time. If you want to upgrade, there is an option. Just ask me about it.',
  },
];

export const PAYMENT = {
  intro: 'There is no automatic payment on this website. After you review your website and you are satisfied with it, talk to me and I will share the payment method.',
  points: ['You see your website before you pay anything.', 'We agree on the price in the chat first.', 'I tell you the payment method when you are ready.'],
  button: 'Talk to the owner about payment',
  message: 'Hi! I would like to ask about the payment method.',
};

// Put your real license or registration details here
export const LICENSE = {
  intro: 'Real details you can check. Webbins is run by one honest developer who is happy to answer any question.',
  items: [
    { label: 'Business name', value: 'Webbins' },
    { label: 'Owner', value: 'Justine Keo Patac' },
    { label: 'License or registration no.', value: 'Add your number here' },
    { label: 'Issued by', value: 'Add the issuing office here' },
    { label: 'Valid until', value: 'Add the date here' },
  ],
};
export const PLEDGES = [
  { title: 'See it before you pay', text: 'I build your website first. You only pay when you are happy with it.' },
  { title: 'You own your website', text: 'I transfer the ownership to your email address when the process is done.' },
  { title: 'Clear prices', text: 'We agree on the price in the chat before I start. No hidden fees.' },
  { title: 'Private conversations', text: 'Your chat is private. Only you and I can read it.' },
  { title: 'Honest communication', text: 'I tell you what is possible and how long it will take.' },
  { title: 'Help after the work', text: 'If you need help, like changing your email password, just message me.' },
];

export const CONTACTS = [
  { label: 'Email', value: 'patacjustinekeo@gmail.com', href: 'mailto:patacjustinekeo@gmail.com' },
  { label: 'Facebook', value: 'facebook.com/yourpage', href: 'https://facebook.com/yourpage' },
  { label: 'Instagram', value: '@yourhandle', href: 'https://instagram.com/yourhandle' },
];
