console.log("move-tasks.js loaded.");

async function pushTasksToToday(args) {
    try {
        console.log("Function triggered with args:", args);

        if (!args || !args.buttonClick) {
            console.log("Script loaded, but not triggered by button click.");
            return;
        }

        // 1. 获取当前活跃文件
        const sourceFile = app.workspace.getActiveFile();
        if (!sourceFile) {
            new obsidian.Notice("Error: No active file is currently open.");
            return;
        }

        // 2. 定位今日日记路径 (强制英文格式以匹配 12-Dec)
        const today = moment();
        const todayYYYY = today.format("YYYY");
        const todayMM = today.format("MM");
        const todayMMM = today.locale('en').format("MMM"); // 强制英文缩写
        const todayDate = today.format("YYYY-MM-DD");
        
        // 对应你的结构: Daily Notes/2025/12-Dec/2025-12-23.md
        const todayFilePath = `Daily Notes/${todayYYYY}/${todayMM}-${todayMMM}/${todayDate}.md`;

        // 3. 检查是否已经在今日笔记中
        if (sourceFile.path === todayFilePath) {
            new obsidian.Notice("NOTE: You are already in today's note.");
            return;
        }

        console.log("Source:", sourceFile.path, "-> Destination:", todayFilePath);

        // 4. 获取或创建今日笔记
        let todayFile = app.vault.getAbstractFileByPath(todayFilePath);
        if (!todayFile) {
            // 如果文件不存在，创建一个带基础结构的
            const initialContent = `---\ntags: [dailynote]\n---\n# Daily Note - ${todayDate}\n\n## :LiListTodo: Planned vs Did\n`;
            await app.vault.create(todayFilePath, initialContent);
            todayFile = app.vault.getAbstractFileByPath(todayFilePath);
        }

        const sourceContent = await app.vault.read(sourceFile);
        const todayContent = await app.vault.read(todayFile);

        // 5. 正则匹配 "Planned vs Did" 章节
        // 修改后的正则可以兼容带图标或不带图标的标题
        const plannedVsDidRegex = /(##+.*Planned vs Did.*\n)((?:- \[.].*\n*)*)/i;
        const match = sourceContent.match(plannedVsDidRegex);

        if (!match) {
            new obsidian.Notice("No 'Planned vs Did' section found.");
            return;
        }

        const sectionHeading = match[1]; 
        const tasksBlock = match[2]; 

        // 6. 分离已完成和未完成任务
        const unfinishedTasks = [];
        const finishedTasks = [];
        tasksBlock.split("\n").forEach(line => {
            if (line.trim().startsWith("- [ ]")) {
                unfinishedTasks.push(line.trim());
            } else if (line.trim().startsWith("- [x]")) {
                finishedTasks.push(line.trim());
            }
        });

        if (unfinishedTasks.length === 0) {
            new obsidian.Notice("No unfinished tasks found.");
            return;
        }

        // 7. 将未完成任务移动到今日笔记
        const movedTasks = unfinishedTasks.map(task => `${task} *(Moved from ${sourceFile.basename})*`);
        
        // 在今日笔记的标题下方插入任务
        const updatedTodayContent = todayContent.replace(
            /(##+.*Planned vs Did.*\n)/i,
            `$1${movedTasks.join("\n")}\n`
        );

        await app.vault.modify(todayFile, updatedTodayContent);

        // 8. 更新原笔记（只保留已完成任务）
        const updatedSourceContent = sourceContent.replace(
            plannedVsDidRegex,
            `${sectionHeading}${finishedTasks.join("\n")}\n\n`
        );

        await app.vault.modify(sourceFile, updatedSourceContent);

        new obsidian.Notice(`✅ Moved ${movedTasks.length} tasks to today.`);
    } catch (error) {
        console.error("Error in pushTasksToToday:", error);
        new obsidian.Notice("Error: Check console for details.");
    }
}

// Meta Bind 调用接口
if (typeof context !== "undefined" && context.args && context.args.buttonClick) {
    pushTasksToToday(context.args);
}

module.exports = pushTasksToToday;