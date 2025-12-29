<%*
// 1. Get the filename of the newly created file
const fileName = tp.file.title; 

// 2. Extract Week Number and Year using Regex
// Matches "Week 52" and the 4-digit year at the end
const weekMatch = fileName.match(/Week\s(\d+)/);
const yearMatch = fileName.match(/,\s(\d{4})/);

// 3. Assign values automatically, falling back to current date if extraction fails
let summaryWeekNumber = weekMatch ? weekMatch[1] : tp.date.now("WW");
let summaryYear = yearMatch ? yearMatch[1] : tp.date.now("YYYY");

// Function to calculate the start and end of an ISO 8601 week (displayed starting Sunday)
function getWeekStartEnd(year, weekNumber) {
    const jan4 = moment(`${year}-01-04`, "YYYY-MM-DD");
    const firstMonday = jan4.clone().startOf('isoWeek');
    const weekMonday = firstMonday.clone().add((weekNumber - 1) * 7, 'days');
    const weekStart = weekMonday.clone().subtract(1, 'day'); // Sunday
    const weekEnd = weekStart.clone().add(6, 'days'); // Following Saturday
    return { weekStart, weekEnd };
}

const { weekStart, weekEnd } = getWeekStartEnd(summaryYear, summaryWeekNumber);

const prevWeekMonday = weekStart.clone().subtract(1, 'week').add(1, 'day');
const prevWeekNumber = prevWeekMonday.isoWeek();
const prevWeekYear = prevWeekMonday.isoWeekYear();
const nextWeekMonday = weekStart.clone().add(1, 'week').add(1, 'day');
const nextWeekNumber = nextWeekMonday.isoWeek();
const nextWeekYear = nextWeekMonday.isoWeekYear();

const { weekStart: prevWeekStart, weekEnd: prevWeekEnd } = getWeekStartEnd(prevWeekYear, prevWeekNumber);
const { weekStart: nextWeekStart, weekEnd: nextWeekEnd } = getWeekStartEnd(nextWeekYear, nextWeekNumber);

const previousWeekTitle = `Week ${prevWeekNumber} (${prevWeekStart.format("MMM D")}-${prevWeekEnd.format("MMM D, YYYY")})`;
const nextWeekTitle = `Week ${nextWeekNumber} (${nextWeekStart.format("MMM D")}-${nextWeekEnd.format("MMM D, YYYY")})`;

// Note: We don't need to rename the file because clicking the link already created it with the correct title.

tR += `---
summary-week-number: ${summaryWeekNumber}
summary-year: ${summaryYear}
week-start: ${weekStart.format("YYYY-MM-DD")}
week-end: ${weekEnd.format("YYYY-MM-DD")}
---
# Weekly Summary - Week ${summaryWeekNumber} (${weekStart.format("MMM D")}–${weekEnd.format("MMM D, YYYY")})

[[${previousWeekTitle}|<< ${previousWeekTitle}]] | [[${nextWeekTitle}|${nextWeekTitle} >>]]

---

## :LiCalendar: Weekday Navigation
| Sun | Mon | Tue | Wed | Thu | Fri | Sat |
| --- | --- | --- | --- | --- | --- | --- |
`;

for (let i = 0; i < 7; i++) {
    const day = weekStart.clone().add(i, 'days');
    const dayNumber = day.format("D");
    const monthFolder = day.format("MM-MMM");
    const dailyNotePath = `Daily Notes/${summaryYear}/${monthFolder}/${day.format("YYYY-MM-DD")}`;

    tR += `| [[${dailyNotePath}\\|${dayNumber}]] `;
}
tR += "|\n\n";

tR += `---

## :LiListTodo: Tasks Overview
\`\`\`dataview
TASK
FROM "Daily Notes" and #dailynote
WHERE file.frontmatter.week-number = this.summary-week-number AND date(file.name).year = this.summary-year
GROUP BY default(due, "No Due Date")
SORT completed DESC, due ASC
\`\`\`

## :LiTrophy: Wins

\`\`\`dataview
LIST L.Win
FROM "Daily Notes"
FLATTEN file.lists AS L
WHERE file.frontmatter.week-number = this.summary-week-number 
  AND date(file.name).year = this.summary-year
  AND L.Win
SORT file.link ASC
\`\`\`

## :LiBrain: Lessons Learned

\`\`\`dataview
LIST L.Learned
FROM "Daily Notes"
FLATTEN file.lists AS L
WHERE file.frontmatter.week-number = this.summary-week-number 
  AND date(file.name).year = this.summary-year
  AND L.Learned
SORT file.link ASC
\`\`\`

## :LiSquirrel: Distractions

\`\`\`dataview
LIST L.Distraction
FROM "Daily Notes"
FLATTEN file.lists AS L
WHERE file.frontmatter.week-number = this.summary-week-number 
  AND date(file.name).year = this.summary-year
  AND L.Distraction
SORT file.link ASC
\`\`\`

## :LiHeartHandshake: Gratitude

\`\`\`dataview
LIST L.Gratitude
FROM "Daily Notes"
FLATTEN file.lists AS L
WHERE file.frontmatter.week-number = this.summary-week-number AND date(file.name).year = this.summary-year
WHERE L.Gratitude
SORT file.link ASC
\`\`\`
`;
%>