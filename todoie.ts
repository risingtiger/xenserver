import { readFile } from "fs/promises";


type PriorityT = "P1" | "P2" | "P3" | "P4" | "P5"
type ReferenceSectionT = "contextTags" | "priorities" | "preparePlaces" | null

export type TodoPrepareT = {
	place: string,
	items: string[],
}

export type TodoTaskT = {
	id: string,
	description: string,
	completed: boolean,
	priority: PriorityT,
	priorityNumber: number,
	tags: string[],
	prepare: TodoPrepareT[],
}

export type TodoProjectT = {
	id: string,
	name: string,
	priority: PriorityT,
	priorityNumber: number,
	tasks: TodoTaskT[],
}

export type TodoieResponseT = {
	title: string,
	projects: TodoProjectT[],
	references: {
		contextTags: { tag: string, meaning: string }[],
		priorities: { priority: PriorityT, meaning: string }[],
		preparePlaces: string[],
	},
	summary: {
		projectCount: number,
		taskCount: number,
		openTaskCount: number,
		completedTaskCount: number,
	},
}

const TODOIE_FILE = "./todoie.md"


async function Get_Todos(): Promise<TodoieResponseT | null> {

	let markdown = ""
	try {
		markdown = await readFile(TODOIE_FILE, "utf8")
	}
	catch {
		return null
	}

	return Parse_Todos(markdown)
}


function Parse_Todos(markdown: string): TodoieResponseT {

	const lines = markdown.split(/\r?\n/)
	const projects: TodoProjectT[] = []
	const references = {
		contextTags: [] as { tag: string, meaning: string }[],
		priorities: [] as { priority: PriorityT, meaning: string }[],
		preparePlaces: [] as string[],
	}

	let title = ""
	let currentProject: TodoProjectT | null = null
	let referenceSection: ReferenceSectionT = null
	let isReferenceArea = false

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		const trimmedLine = line.trim()
		const lineNumber = i + 1

		if (!trimmedLine) continue

		if (!title && trimmedLine.startsWith("# ")) {
			title = trimmedLine.slice(2).trim()
			continue
		}

		if (trimmedLine === "---") {
			currentProject = null
			isReferenceArea = true
			continue
		}

		if (trimmedLine.startsWith("## ")) {
			const heading = trimmedLine.slice(3).trim()
			const nextReferenceSection = Get_Reference_Section(heading)

			if (nextReferenceSection) {
				referenceSection = nextReferenceSection
				currentProject = null
				isReferenceArea = true
				continue
			}

			if (isReferenceArea) continue

			currentProject = Parse_Project_Heading(heading, projects.length + 1)
			projects.push(currentProject)
			continue
		}

		if (referenceSection) {
			Parse_Reference_Line(referenceSection, trimmedLine, references)
			continue
		}

		if (!currentProject) continue
		if (!trimmedLine.startsWith("[")) continue

		const task = Parse_Task_Line(trimmedLine, currentProject.id, lineNumber)
		if (!task) continue

		currentProject.tasks.push(task)
	}

	let taskCount = 0
	let completedTaskCount = 0
	for (const project of projects) {
		for (const task of project.tasks) {
			taskCount++
			if (task.completed) completedTaskCount++
		}
	}

	return {
		title,
		projects,
		references,
		summary: {
			projectCount: projects.length,
			taskCount,
			openTaskCount: taskCount - completedTaskCount,
			completedTaskCount,
		},
	}
}


function Parse_Project_Heading(heading: string, projectNumber: number): TodoProjectT {

	const priorityMatch = heading.match(/\s+\[(P[1-5])\]\s*$/)
	const priority = To_Priority(priorityMatch ? priorityMatch[1] : "P5")
	const name = heading.replace(/\s+\[P[1-5]\]\s*$/, "").trim()
	const id = Slugify(name) || `project-${projectNumber}`

	return {
		id,
		name,
		priority,
		priorityNumber: Priority_Number(priority),
		tasks: [],
	}
}


function Parse_Task_Line(line: string, projectId: string, lineNumber: number): TodoTaskT | null {

	const taskMatch = line.match(/^\[( |x|X)\]\s+(.*)$/)
	if (!taskMatch) return null

	const completed = taskMatch[1].toLowerCase() === "x"
	const taskContent = taskMatch[2].trim()
	const priorityMatch = taskContent.match(/\s+\[(P[1-5])\]\s*$/)
	const priority = To_Priority(priorityMatch ? priorityMatch[1] : "P5")
	const contentWithoutPriority = taskContent.replace(/\s+\[P[1-5]\]\s*$/, "").trim()
	const prepareResult = Extract_Prepare(contentWithoutPriority)
	const tags = Extract_Tags(prepareResult.textWithoutPrepare)
	const description = prepareResult.textWithoutPrepare.replace(/#[A-Za-z0-9_-]+/g, "").replace(/\s+/g, " ").trim()
	const id = `${projectId}-${Slugify(description) || `task-${lineNumber}`}`

	return {
		id,
		description,
		completed,
		priority,
		priorityNumber: Priority_Number(priority),
		tags,
		prepare: prepareResult.prepare,
	}
}


function Extract_Prepare(text: string): { textWithoutPrepare: string, prepare: TodoPrepareT[] } {

	const prepare: TodoPrepareT[] = []
	const prepareMatch = text.match(/\[\(.*\)\]/)
	if (!prepareMatch) return { textWithoutPrepare: text, prepare }

	const prepareText = prepareMatch[0]
	const entryRegex = /\(([^:()]+):([^()]*)\)/g
	let entryMatch = entryRegex.exec(prepareText)

	while (entryMatch) {
		const place = entryMatch[1].trim()
		const items = entryMatch[2].split(",").map((item) => item.trim()).filter((item) => item.length > 0)
		prepare.push({ place, items })
		entryMatch = entryRegex.exec(prepareText)
	}

	return {
		textWithoutPrepare: text.replace(prepareText, "").replace(/\s+/g, " ").trim(),
		prepare,
	}
}


function Extract_Tags(text: string): string[] {

	const tags: string[] = []
	const tagRegex = /#[A-Za-z0-9_-]+/g
	let tagMatch = tagRegex.exec(text)

	while (tagMatch) {
		tags.push(tagMatch[0])
		tagMatch = tagRegex.exec(text)
	}

	return tags
}


function Parse_Reference_Line(referenceSection: ReferenceSectionT, line: string, references: TodoieResponseT["references"]) {

	if (referenceSection === "preparePlaces") {
		if (!line.startsWith("- ")) return
		references.preparePlaces.push(line.slice(2).trim())
		return
	}

	if (!line.startsWith("|")) return

	const cells = Split_Table_Row(line)
	if (cells.length < 2) return

	if (referenceSection === "contextTags") {
		const tag = cells[0].replace(/`/g, "").trim()
		if (!tag.startsWith("#")) return
		references.contextTags.push({ tag, meaning: cells[1].trim() })
		return
	}

	if (referenceSection === "priorities") {
		const priorityText = cells[0].replace(/`/g, "").replace(/[\[\]]/g, "").trim()
		if (!Is_Priority(priorityText)) return
		references.priorities.push({ priority: priorityText, meaning: cells[1].trim() })
		return
	}
}


function Split_Table_Row(line: string): string[] {

	return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim())
}


function Get_Reference_Section(heading: string): ReferenceSectionT {

	const normalizedHeading = heading.toLowerCase()

	if (normalizedHeading === "context tags reference") return "contextTags"
	if (normalizedHeading === "priorities reference") return "priorities"
	if (normalizedHeading === "prepare places reference") return "preparePlaces"

	return null
}


function To_Priority(priority: string): PriorityT {

	if (Is_Priority(priority)) return priority

	return "P5"
}


function Is_Priority(priority: string): priority is PriorityT {

	return priority === "P1" || priority === "P2" || priority === "P3" || priority === "P4" || priority === "P5"
}


function Priority_Number(priority: PriorityT): number {

	return Number(priority.slice(1))
}


function Slugify(value: string): string {

	return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

async function AskQuestion(storage:any, ai:any, question:string) : Promise<TodoieResponseT | null> {

	const skill   = "bucket/xenition/skill_todoie.md"
	const content = "bucket/xenition/todoie.md"
	const model   = "gpt-5.5"

	try {
		return await ai.AskWithSkill(storage, model, skill, question, content)
	}
	catch {
		return null
	}
}

const Todoie = {
	AskQuestion,
	Get_Todos,
	Parse_Todos,
}

export default Todoie;
