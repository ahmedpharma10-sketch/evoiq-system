# Corporate Management Application - Design Guidelines

## Design Approach
**Selected Approach:** Design System - Fluent/Material Design inspired
**Justification:** Enterprise productivity application requiring clear information hierarchy, data-dense interfaces, and professional credibility. The application prioritizes efficiency, learnability, and data management over visual experimentation.

**Key Design Principles:**
- Professional credibility through restrained design
- Information clarity with strong visual hierarchy
- Efficient workflows with minimal cognitive load
- Consistent patterns across all management functions

---

## Core Design Elements

### A. Color Palette

**Primary Colors:**
- Primary Blue: 217 91% 60% (professional, trustworthy corporate blue)
- Primary Blue Dark: 217 91% 45% (hover/active states)
- Primary Blue Light: 217 91% 95% (subtle backgrounds, selected states)

**Neutral Colors:**
- White: 0 0% 100% (main backgrounds, cards)
- Gray 50: 220 14% 96% (subtle backgrounds)
- Gray 100: 220 13% 91% (borders, dividers)
- Gray 300: 220 9% 70% (placeholder text)
- Gray 600: 220 9% 46% (secondary text)
- Gray 900: 220 13% 18% (primary text, headings)

**Status Colors:**
- Success Green: 142 76% 36% (completed tasks)
- Warning Amber: 38 92% 50% (upcoming deadlines)
- Error Red: 0 84% 60% (overdue tasks)
- Info Blue: 199 89% 48% (notifications)

### B. Typography

**Font Family:** Inter (via Google Fonts CDN)
- Primary: 'Inter', system-ui, sans-serif
- Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto

**Type Scale:**
- Headings: text-2xl to text-3xl, font-semibold (page titles)
- Section Headers: text-lg to text-xl, font-medium (tab names, card headers)
- Body Text: text-base, font-normal (form labels, table content)
- Secondary Text: text-sm, font-normal (metadata, helper text)
- Tiny Text: text-xs (badges, timestamps)

### C. Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, and 8
- Micro spacing: p-2, gap-2 (tight groupings, icon spacing)
- Standard spacing: p-4, gap-4, mb-4 (card padding, form fields)
- Section spacing: p-6, mb-6 (between sections, card groups)
- Large spacing: p-8, mb-8 (page margins, major divisions)

**Container Strategy:**
- Full viewport application with fixed header
- Main content: max-w-7xl mx-auto px-4
- Forms and cards: max-w-4xl for optimal reading width
- Tables: full container width with horizontal scroll

### D. Component Library

**Navigation:**
- Top header bar: Full-width, white background, subtle shadow, height h-16
- Tab navigation: Horizontal tabs with blue underline indicator, text-base font-medium
- Active tab: Blue text + 2px bottom border
- Inactive tabs: Gray text with hover state

**Data Tables:**
- White background with border
- Header row: Gray background (bg-gray-50), font-semibold, sticky positioning
- Row hover: Subtle gray highlight (bg-gray-50)
- Cell padding: px-4 py-3 for comfortable spacing
- Borders: 1px solid gray-100 between rows

**Forms:**
- Input fields: White background, gray border, rounded-md, px-4 py-2
- Labels: text-sm font-medium text-gray-700, mb-2
- Focus state: Blue ring (ring-2 ring-blue-500)
- Field groups: gap-4 for vertical spacing between fields
- Multi-column forms: grid-cols-2 on desktop for efficiency

**Cards:**
- White background with subtle shadow (shadow-sm)
- Rounded corners: rounded-lg
- Padding: p-6
- Border: 1px solid gray-100
- Hover state for clickable cards: shadow-md transition

**Buttons:**
- Primary: Blue background, white text, px-4 py-2, rounded-md, font-medium
- Secondary: White background, blue text, blue border (variant="outline")
- Danger: Red background for delete actions
- Icon buttons: Square p-2, gray on hover
- Use Heroicons (outline style) for all button icons

**Task Status Indicators:**
- Overdue: Red badge with filled background
- Due Soon (within 30 days): Amber badge
- Upcoming: Green badge
- Badge style: Rounded-full, px-3 py-1, text-xs font-medium

**Search:**
- Search input with magnifying glass icon (Heroicons)
- Full-width on mobile, max-w-md on desktop
- Real-time filtering feedback with result count display

**Modals/Dialogs:**
- Centered overlay with backdrop blur
- White background, rounded-lg, shadow-xl
- Max-w-2xl for forms, max-w-md for confirmations
- Header with title and close button (X icon)

### E. Interactions & Animations

**Minimal Animation Strategy:**
- Hover transitions: 150ms ease for buttons and cards
- Tab switching: No animation, instant switching for efficiency
- Modal entrance: 200ms fade-in for overlay, scale from 95% to 100%
- NO page transitions, carousels, or scroll animations
- Focus: Immediate blue ring appearance

---

## Application-Specific Patterns

**Dashboard Layout:**
- Fixed header with logo and main navigation tabs
- Content area: Full width with internal max-w-7xl container
- No sidebar navigation (use tabs instead)

**Company List View:**
- Table with sortable columns (company name, number, director, incorporation date)
- Search bar above table, aligned to right
- Add Company button: Primary blue, top-right position
- Pagination if needed: Bottom of table, centered

**Add Company Form:**
- Two-column grid layout on desktop (grid-cols-2 gap-4)
- Logical grouping: Company Details, Directors/PSC, Government & Codes, Contacts
- Section dividers: Horizontal line with heading
- Submit button: Bottom right, primary blue

**Task Management:**
- Task list table with status badges
- Due date prominently displayed with color coding
- Filter controls: Dropdown for task type and status
- Auto-calculated dates shown in gray text below manual overrides

**No Images Required:** This is a data-focused enterprise application. Use icons from Heroicons for visual enhancement instead of photography.