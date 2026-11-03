// The background map draws from this list. Add a project here and it appears.
//
//   name    label on the map
//   about   one sentence shown on hover
//   url     optional: where a click goes (leave it out for private work)
//   weight  sets the dot size; roughly the commit count
//   tags    each tag becomes a hollow hub, and projects sharing one get connected
//   live    optional: true if url is a running site rather than a repo
window.PROJECTS = [
  {
    name: "OWCS Muse",
    about: "Ask about the Overwatch Champions Series in plain English and get a sentence back, with the rows behind it.",
    url: "https://github.com/L4wson/OWCSMuse",
    weight: 174,
    tags: ["Python", "React", "Postgres", "FastAPI"],
  },
  {
    name: "Bobcat Bulletin",
    about: "A searchable dashboard of 23,000+ UC Merced police activity log incidents.",
    url: "https://github.com/L4wson/bobcat-bulletin",
    weight: 39,
    tags: ["Python", "React", "FastAPI"],
  },
  {
    name: "LiftLabs",
    about: "A fitness forum with JWT auth, role-based moderation, and one vote per user.",
    url: "https://liftlabs.vercel.app/",
    live: true,
    weight: 30,
    tags: ["React", "Postgres", "Flask"],
  },
  {
    name: "Greenview",
    about: "A Chrome and Firefox extension that tags job links by the application system behind them.",
    url: "https://github.com/L4wson/Greenview",
    weight: 6,
    tags: ["JavaScript"],
  },
  {
    name: "Receipt Pipeline",
    about: "A React Native app and Flask API that turn receipt photos into structured data for Google Sheets. I led this one during my Robotics Cats internship.",
    weight: 30,
    tags: ["Python", "Flask", "Robotics Cats"],
  },
  {
    name: "LConnect",
    about: "A Python tool that feeds camera snapshots to Robotics Cats' wildfire detection.",
    url: "https://github.com/quantumleapquokka/Project-1",
    weight: 31,
    tags: ["Python", "Robotics Cats"],
  },
  {
    name: "jlawson.tech",
    about: "This site.",
    url: "https://github.com/L4wson/L4wson.github.io",
    weight: 40,
    tags: ["JavaScript"],
  },
];