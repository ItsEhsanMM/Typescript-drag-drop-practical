// Drag & Drop Interfaces
interface Draggable {
   dragStartHandler(e: DragEvent): void;
   dragEndHandler(e: DragEvent): void;
}

interface DragTarget {
   dragOverHandler(e: DragEvent): void;
   dropHandler(e: DragEvent): void;
   dragLeaveHandler(e: DragEvent): void;
}

enum ProjectStatus {
   Active,
   Finished,
}

// Project status
class Project {
   constructor(
      public id: string,
      public title: string,
      public description: string,
      public people: number,
      public status: ProjectStatus
   ) {}
}

type Listener<T> = (items: T[]) => void;

class state<T> {
   protected listeners: Listener<T>[] = [];

   addListener(listenersFn: Listener<T>) {
      this.listeners.push(listenersFn);
   }
}

// Project state
class ProjectState extends state<Project> {
   private projects: Project[] = [];
   private static instance: ProjectState;

   private constructor() {
      super();
   }

   static getInstance() {
      if (this.instance) {
         return this.instance;
      }
      this.instance = new ProjectState();
      return this.instance;
   }

   addProject(title: string, description: string, people: number) {
      const newProj = new Project(
         Math.random().toString(),
         title,
         description,
         people,
         ProjectStatus.Active
      );
      this.projects.push(newProj);
      this.updateListener();
   }

   moveProject(projectId: string, newStatus: ProjectStatus) {
      const project = this.projects.find((item) => item.id === projectId);

      if (project && project.status !== newStatus) {
         project.status = newStatus;
         this.updateListener();
      }
   }

   updateListener() {
      for (const listenersFn of this.listeners) {
         listenersFn(this.projects.slice());
      }
   }
}

const projectState = ProjectState.getInstance();

// validator
interface validate {
   value: string | number;
   required?: boolean;
   minLength?: number;
   maxLength?: number;
   min?: number;
   max?: number;
}

const validator = (validationProps: validate) => {
   let isValid = true;
   if (validationProps.required) {
      isValid = isValid && validationProps.value.toString().trim().length !== 0;
   }
   if (validationProps.minLength != null && typeof validationProps.value === "string") {
      isValid = isValid && validationProps.value.length >= validationProps.minLength;
   }
   if (validationProps.maxLength != null && typeof validationProps.value === "string") {
      isValid = isValid && validationProps.value.length <= validationProps.maxLength;
   }
   if (validationProps.min != null && typeof validationProps.value === "number") {
      isValid = isValid && validationProps.value >= validationProps.min;
   }
   if (validationProps.max != null && typeof validationProps.value === "number") {
      isValid = isValid && validationProps.value <= validationProps.max;
   }
   return isValid;
};

// auto bind
const autoBind = (_: any, _2: string, descriptor: PropertyDescriptor) => {
   const originalMethod = descriptor.value;
   const adjDescriptor: PropertyDescriptor = {
      configurable: true,
      get() {
         return originalMethod.bind(this);
      },
   };
   return adjDescriptor;
};
// end of auto bind

abstract class Component<T extends HTMLElement, U extends HTMLElement> {
   templateElement: HTMLTemplateElement;
   hostElement: T;
   element: U;

   constructor(
      templateId: string,
      hostElId: string,
      insertAtStart: boolean,
      newElId?: string
   ) {
      this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement;

      this.hostElement = document.getElementById(hostElId)! as T;

      const importedNode = document.importNode(this.templateElement.content, true);
      this.element = importedNode.firstElementChild as U;
      if (newElId) {
         this.element.id = newElId;
      }
      this.attach(insertAtStart);
   }

   private attach(insert: boolean) {
      this.hostElement.insertAdjacentElement(
         insert ? "afterbegin" : "beforeend",
         this.element
      );
   }

   abstract configure(): void;
   abstract renderContent(): void;
}

// Project Item
class ProjectItem
   extends Component<HTMLUListElement, HTMLLIElement>
   implements Draggable
{
   private project: Project;
   constructor(hostId: string, project: Project) {
      super("single-project", hostId, false, project.id);
      this.project = project;
      this.configure();
      this.renderContent();
   }

   @autoBind
   dragStartHandler(e: DragEvent): void {
      e.dataTransfer!.setData("text/plain", this.element.id);
      e.dataTransfer!.effectAllowed = "move";
   }

   dragEndHandler(e: DragEvent): void {
      console.log(e);
   }

   configure() {
      this.element.addEventListener("dragstart", this.dragStartHandler);
      this.element.addEventListener("dragend", this.dragEndHandler);
   }

   renderContent() {
      this.element.querySelector("h2")!.textContent = this.project.title;
      this.element.querySelector(
         "h3"
      )!.textContent = `${this.project.people.toString()} ${
         this.project.people === 1 ? "person" : "persons"
      } assigned`;
      this.element.querySelector("p")!.textContent = this.project.description;
   }
}

class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget {
   assignedProjects: Project[];

   constructor(private type: "active" | "finished") {
      super("project-list", "app", false, `${type}-projects`);
      this.assignedProjects = [];

      this.configure();
      this.renderContent();
   }

   @autoBind
   dragOverHandler(e: DragEvent): void {
      if (e.dataTransfer && e.dataTransfer.types[0] === "text/plain") {
         e.preventDefault();
         const listEl = this.element.querySelector("ul");
         listEl?.classList.add("droppable");
      }
   }

   @autoBind
   dragLeaveHandler(e: DragEvent): void {
      const listEl = this.element.querySelector("ul");
      listEl?.classList.remove("droppable");
   }

   @autoBind
   dropHandler(e: DragEvent): void {
      const project = e.dataTransfer!.getData("text/plain");
      projectState.moveProject(
         project,
         this.type === "active" ? ProjectStatus.Active : ProjectStatus.Finished
      );
   }

   configure() {
      this.element.addEventListener("dragover", this.dragOverHandler);
      this.element.addEventListener("dragleave", this.dragLeaveHandler);
      this.element.addEventListener("drop", this.dropHandler);

      projectState.addListener((project: Project[]) => {
         const relevantProject = project.filter((items) => {
            return this.type === "active"
               ? items.status === ProjectStatus.Active
               : items.status === ProjectStatus.Finished;
         });
         this.assignedProjects = relevantProject;
         this.renderProject();
      });
   }

   renderContent() {
      const listId = `${this.type}-projects-list`;
      this.element.querySelector("ul")!.id = listId;
      this.element.querySelector("h2")!.textContent =
         this.type.toUpperCase() + " PROJECTS";
   }

   private renderProject() {
      const listEl = document.getElementById(
         `${this.type}-projects-list`
      )! as HTMLUListElement;
      listEl.innerHTML = "";
      for (const projItem of this.assignedProjects) {
         new ProjectItem(this.element.querySelector("ul")!.id, projItem);
      }
   }
}

class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
   titleFormElement: HTMLInputElement;
   descriptionFormElement: HTMLInputElement;
   peopleFormElement: HTMLInputElement;

   constructor() {
      super("project-input", "app", true, "user-input");

      this.titleFormElement = this.element.querySelector("#title")! as HTMLInputElement;
      this.descriptionFormElement = this.element.querySelector(
         "#description"
      )! as HTMLInputElement;
      this.peopleFormElement = this.element.querySelector("#people")! as HTMLInputElement;

      this.configure();
   }

   configure() {
      document.addEventListener("submit", this.submitHandler.bind(this));
   }
   renderContent() {}

   private getUserInputs(): [string, string, number] | void {
      const title = this.titleFormElement.value;
      const description = this.descriptionFormElement.value;
      const people = this.peopleFormElement.value;

      const titleValidatable: validate = {
         value: title,
         required: true,
      };
      const descriptionValidatable: validate = {
         value: description,
         required: true,
         minLength: 5,
      };
      const peopleValidatable: validate | void = {
         value: +people,
         required: true,
         min: 1,
      };

      if (
         !(
            validator(titleValidatable) &&
            validator(peopleValidatable) &&
            validator(descriptionValidatable)
         )
      ) {
         alert("invalid input");
         return;
      } else {
         return [title, description, +people];
      }
   }

   private clearInput() {
      this.titleFormElement.value = "";
      this.descriptionFormElement.value = "";
      this.peopleFormElement.value = "";
   }

   @autoBind
   private submitHandler(e: Event) {
      e.preventDefault();
      const userInput = this.getUserInputs();
      if (Array.isArray(userInput)) {
         projectState.addProject(
            this.titleFormElement.value,
            this.descriptionFormElement.value,
            +this.peopleFormElement.value
         );
         this.clearInput();
      }
   }
}

const projInput = new ProjectInput();
const activeProj = new ProjectList("active");
const finishedProj = new ProjectList("finished");
