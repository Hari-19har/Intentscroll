# IntentScroll

Doomscroll with intent.

IntentScroll replaces endless, random scrolling with short videos about what you
actually want to learn. Create a topic tab, pick a language, and get a feed that
ends when you hit your goal.

## Features
- Topic tabs with a language and a daily video goal
- Auto-find relevant YouTube Shorts for any topic
- AI-written key ideas that appear at the start of your feed
- Finite feeds, progress rings, streaks, and a quick quiz
- Light and dark mode, minimal-motion mode, installable as a PWA
- Your data stays in your browser

## Tech
Vanilla JS front end, Cloudflare Pages + Pages Functions, YouTube Data API,
Claude API. No build step.

## Run it
See the deploy steps below. You need a `YOUTUBE_API_KEY` and, optionally,
an `ANTHROPIC_API_KEY` set as Cloudflare secrets. Never commit keys.
