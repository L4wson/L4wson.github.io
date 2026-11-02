// The background map draws from this list. Add a project here and it appears.
//
//   name    label on the map
//   about   one sentence shown on hover
//   url     where a click goes
//   weight  sets the dot size; roughly the commit count
//   tags    each tag becomes a hollow hub, and projects sharing one get connected
//   live    optional: true if url is a running site rather than a repo
window.PROJECTS = [
  {
    name: "OWCS Muse",
    about: "Ask about the Overwatch Champions Series in plain English and get a sentence back, with the rows behind it.",
    url: "https://github.com/L4wson/OWCSMuse",
    weight: 174,
    tags: ["Python", "React", "Postgres", "Overwatch"],
  },
  {
    name: "Bobcat Bulletin",
    about: "A campus safety dashboard for UC Merced, built from the police department's daily activity logs.",
    url: "https://github.com/L4wson/bobcat-bulletin",
    weight: 39,
    tags: ["Python", "React"],
  },
  {
    name: "LiftLabs",
    about: "A full-stack discussion forum with JWT authentication and role-based moderation.",
    url: "https://liftlabs.vercel.app/",
    live: true,
    weight: 30,
    tags: ["React", "Postgres"],
  },
  {
    name: "Greenview",
    about: "A browser extension that color-codes job listings by where the application link really goes.",
    url: "https://github.com/L4wson/Greenview",
    weight: 6,
    tags: ["JavaScript"],
  },
  {
    name: "LConnect",
    about: "A desktop app for configuring cameras and sending snapshots to Robotics Cats' Lookout fire detection API.",
    url: "https://github.com/quantumleapquokka/Project-1",
    weight: 31,
    tags: ["Python", "Robotics Cats"],
  },
  {
    name: "Trivia Daily",
    about: "A team-built web game with five trivia questions a day.",
    url: "https://github.com/W5-a11y/RC_Project3",
    weight: 41,
    tags: ["React", "Python", "Robotics Cats"],
  },
  {
    name: "Finance Tracker",
    about: "A Python desktop app that helps college students balance their finances.",
    url: "https://github.com/L4wson/Personal-Finance-Tracker",
    weight: 20,
    tags: ["Python"],
  },
  {
    name: "TIP Problem Sets",
    about: "My attempts at solving all of the Technical Interview Prep 101 problem sets on my own.",
    url: "https://github.com/L4wson/TIP-Problem-Sets",
    weight: 13,
    tags: ["Python"],
  },
  {
    name: "Napoletana",
    about: "An objective-based pomodoro timer for college students.",
    url: "https://github.com/L4wson/Napoletana",
    weight: 9,
    tags: ["JavaScript"],
  },
  {
    name: "TicTacToe",
    about: "A very basic tic-tac-toe game.",
    url: "https://github.com/L4wson/TicTacToe",
    weight: 10,
    tags: ["JavaScript"],
  },
  {
    name: "jlawson.tech",
    about: "This site.",
    url: "https://github.com/L4wson/L4wson.github.io",
    weight: 40,
    tags: ["JavaScript"],
  },
];

// Private repos show up as unnamed white specks. This is only a count.
window.PRIVATE_REPOS = 23;
