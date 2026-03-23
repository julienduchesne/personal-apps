import type { Exercise } from "./types";

export const EXERCISES: Exercise[] = [
  // Right Hand (Arpeggios & Tone)
  { name: "Giuliani #1 (p-i-m)", category: "right_hand", focus: "Basic thumb/finger coordination" },
  { name: "Giuliani #2 (p-m-i)", category: "right_hand", focus: "Reverse arpeggio pattern" },
  { name: "Giuliani #3 (p-i-m-a-m-i)", category: "right_hand", focus: "Extended arpeggio flow" },
  { name: "Planting Drill", category: "right_hand", focus: "Speed/accuracy by pre-planting fingers" },
  { name: "Rest Stroke vs Free Stroke", category: "right_hand", focus: "Alternating on a single string" },
  { name: "Thumb Independence", category: "right_hand", focus: "Playing a melody with thumb while fingers hold a chord" },
  { name: "Tremolo Prep", category: "right_hand", focus: "p-a-m-i on a single string (slowly)" },
  // Left Hand (Strength & Agility)
  { name: "The Spider (1-2-3-4)", category: "left_hand", focus: "Basic finger independence across strings" },
  { name: "The Spider (Diagonal)", category: "left_hand", focus: "Finger 1 on String 6, Finger 2 on String 5, etc." },
  { name: "Hammer-ons (Ascending Slurs)", category: "left_hand", focus: "Building strength in fingers 3 and 4" },
  { name: "Pull-offs (Descending Slurs)", category: "left_hand", focus: "Accuracy and flicking motion" },
  { name: "Fixed Finger Drills", category: "left_hand", focus: "Hold fingers 1 & 2 while 3 & 4 move" },
  { name: "Horizontal Shifts", category: "left_hand", focus: "Sliding a single finger from Fret 1 to Fret 12 accurately" },
  { name: "Barre Squeeze & Release", category: "left_hand", focus: "Building stamina without hand cramping" },
  // Coordination & Scales
  { name: "C Major (Segovia Fingering)", category: "coordination_scales", focus: "Basic 2-octave fluency" },
  { name: "A Minor Melodic", category: "coordination_scales", focus: "Understanding scale variations" },
  { name: "Chromatic Scale (Full Neck)", category: "coordination_scales", focus: "Synchronization of both hands" },
  { name: "Double Stops (3rds)", category: "coordination_scales", focus: "Playing scales in intervals of thirds" },
  { name: "Double Stops (6ths)", category: "coordination_scales", focus: "Playing scales in intervals of sixths" },
  { name: "String Crossing Drill", category: "coordination_scales", focus: "i-m alternation while jumping non-adjacent strings" },
  // Specialized Technique
  { name: "Vibrato Pulse", category: "specialized", focus: "Developing a relaxed, wide vibrato" },
  { name: "Natural Harmonics", category: "specialized", focus: "Precision at 12th, 7th, and 5th frets" },
  { name: "Pizzicato (Palm Mute)", category: "specialized", focus: "Thumb accuracy with palm damping" },
  { name: "Descending Arpeggio", category: "specialized", focus: "Speed on treble strings" },
  { name: "Rest Stroke Scales", category: "specialized", focus: "Developing volume and punch in melodies" },
];
