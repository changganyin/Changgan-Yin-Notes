---
created: <% tp.file.creation_date() %>
tags:
  - dailynote
description: Daily Note - <% moment(tp.file.title, 'YYYY-MM-DD').format("dddd, MMMM DD, YYYY") %>
week-number: <% moment(tp.file.title, 'YYYY-MM-DD').week()  %>
year: <% moment(tp.file.title, 'YYYY-MM-DD').year() %>
---

# :LiCalendarFold: Daily Note - <% moment(tp.file.title, 'YYYY-MM-DD').format("dddd, MMMM DD, YYYY") %>
| Sun | Mon | Tue | Wed | Thu | Fri | Sat | Week |
|----:|----:|----:|----:|----:|----:|----:|:----:|
<%*
const currentDate = moment(tp.file.title, "YYYY-MM-DD"); // Parse file.name as a date
// Get the Monday of each week (ISO 8601 week start), then subtract 1 day to get Sunday for display
const startOfLastWeek = currentDate.clone().startOf('isoWeek').subtract(1, 'weeks').subtract(1, 'day'); // Sunday of last week
const startOfThisWeek = currentDate.clone().startOf('isoWeek').subtract(1, 'day'); // Sunday of this week
const startOfNextWeek = currentDate.clone().startOf('isoWeek').add(1, 'weeks').subtract(1, 'day'); // Sunday of next week

// Function to generate a single week row with week link
function generateWeekRow(startDate) {
    let isCurrentWeek = false
    let row = "|";
    for (let i = 0; i < 7; i++) {
        const day = startDate.clone().add(i, 'days'); // Add i days to the start date
        const dayNumber = day.format("DD"); // Format day as two-digit number
        const dayString = day.format("YYYY-MM-DD"); // Format full date
        if (currentDate.format("YYYY-MM-DD") === dayString) {
            row += ` **${dayNumber}** |`; // Bold and unlink the current date
            isCurrentWeek = true
        } else {
            row += ` [[${dayString}\\|${dayNumber}]] |`; // Link other dates
        }
    }
    // Append the weekly link
    // Get the Monday of this week to calculate the correct ISO week number
    const monday = startDate.clone().add(1, 'day');
    const weekNumber = monday.isoWeek(); // Use ISO 8601 week numbering
    const year = monday.isoWeekYear(); // Get ISO week year (may differ from calendar year in edge cases)
    const weekFileName = `Week ${weekNumber} (${startDate.format("MMM D")}-${startDate.clone().endOf('week').format("MMM D, YYYY")})`;
    const weekFilePath = `Daily Notes/${year}/Weeks/${weekFileName}`;

	if ( isCurrentWeek ) {
	    row += ` **[[${weekFilePath}\\|Week ${weekNumber}]]** |`; // Add week link
	} else {
	    row += ` *[[${weekFilePath}\\|Week ${weekNumber}]]* |`; // Add week link
	}
	return row;
}

// Generate rows for last week, this week, and next week
tR += generateWeekRow(startOfLastWeek) + "\n";
tR += generateWeekRow(startOfThisWeek) + "\n";
tR += generateWeekRow(startOfNextWeek) + "\n";
%>

---
## :LiListTodo: Planned vs Did
- [ ] <% tp.file.cursor(1) %>

```meta-bind-button
style: primary
label: Push Unfinished to TODAY
action:
  type: js
  file: Scripts/move-tasks.js
  args:
    buttonClick: true
```
---
### :LiTrophy: Wins
- 

### :LiBrain: Learned
- 

### :LiSquirrel: Distractions
- 

### :LiHeartHandshake: Gratitude
- 

---
## :LiFilePlus2: Notes created today
```dataview
Table file.mtime as "Modified", file.folder as "Folder" FROM "" WHERE file.cday = date(this.file.name) SORT file.ctime asc
```
## :LiFileEdit: Notes modified today
```dataview
Table file.cday as "Created", file.folder as "Folder" FROM "" WHERE file.mday = date(this.file.name) SORT file.mtime asc
```
