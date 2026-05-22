import { Entity } from './entity.js';
import { UIPanel } from './ui-panel.js';
import { UIButton } from './ui-button.js';
import * as engine from '../engine.js';
import { UIText } from './ui-text.js';
import { UIPropertyEditor } from './ui-property-editor.js';

export class EntityDebugSceneTree extends Entity {
  constructor({ x = 0, y = 30 } = {}) {
    super({ tag: 'debug-SCENE-TREE', groups: ['debug'] });
    this.panel = new UIPanel({
      x, y,
      height: engine.getScreenSize().height,
      direction: 'vertical',
      background: 'rgba(0,0,0,0.7)',
      padding: 5,
      scrollable: true
    });
    this.collapsed = {};
    this.inspecting = {};
    this.editor = new UIPropertyEditor();
  }

  input(event, e) {
    if (this.editor.active) return;
    this.panel.input(event, e);
  }

  draw(ctx) {
    const tree = engine.getSceneTree();
    this.panel.children = [];

    let totalEntities = 0;
    for (const scene of tree) {
      const count = (s) => {
        let c = s.entities.length;
        for (const child of s.children) c += count(child);
        return c;
      };
      totalEntities += count(scene);
    }
    this.panel.add(new UIText(
      `Scene Tree (${tree.length} scenes, ${totalEntities} entities)`,
      { color: '#ffffff', font: '11px monospace' }
    ));

    const addProperties = (obj, indent) => {
      const props = Object.entries(obj).filter(([k]) => !k.startsWith('_'));
      for (const [propKey, value] of props) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          this.panel.add(new UIText(
            `${indent}${propKey}:`,
            { color: '#999999', font: '10px monospace' }
          ));
          addProperties(value, `${indent}  `);
        } else {
          let display;
          if (value === null) display = 'null';
          else if (value === undefined) display = 'undefined';
          else if (Array.isArray(value)) display = JSON.stringify(value).slice(0, 40);
          else display = String(value).slice(0, 40);

          const editable = typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';

          this.panel.add(new UIButton(
            `${indent}${propKey}: ${display}`,
            editable ? () => {
              const mouse = engine.getMousePosition();
              this.editor.open(mouse.x, mouse.y, value, (newVal) => {
                if (typeof value === 'number') obj[propKey] = Number(newVal);
                else if (typeof value === 'boolean') obj[propKey] = newVal === 'true';
                else obj[propKey] = newVal;
              });
            } : () => {},
            { color: editable ? '#cccccc' : '#666666', hoverColor: editable ? '#ffffff' : '#666666', font: '10px monospace' }
          ));
        }
      }
    };

    const addScene = (scene, depth) => {
      const indent = '  '.repeat(depth);
      const key = `scene-${scene.name}-${scene.index}`;
      const inspectKey = `inspect-scene-${scene.index}`;
      const isCollapsed = this.collapsed[key];
      const isInspecting = this.inspecting[inspectKey];
      const arrow = isCollapsed ? '▶' : '▼';
      const totalItems = scene.entities.length + scene.children.length;

      const row = new UIPanel({ direction: 'horizontal', transparent: true, padding: 0 });
      row.add(new UIButton(
        `${indent}${arrow}`,
        () => { this.collapsed[key] = !this.collapsed[key]; },
        { color: '#888888', hoverColor: '#ffffff', font: '11px monospace' }
      ));
      row.add(new UIButton(
        `#${scene.index} [z:${scene.z}] ${scene.name} (${totalItems})`,
        () => engine.removeScene(scene.name),
        { color: '#c2fdfd', hoverColor: '#ff4444', font: '11px monospace' }
      ));
      row.add(new UIButton(
        '?',
        () => { this.inspecting[inspectKey] = !this.inspecting[inspectKey]; },
        { color: isInspecting ? '#ffffff' : '#555555', hoverColor: '#ffffff', font: '11px monospace' }
      ));
      this.panel.add(row);

      if (isInspecting) {
        const sceneObj = engine.getScenes().find(s => s.scene.name === scene.name);
        if (sceneObj) {
          addProperties(sceneObj.scene, `${indent}      `);
        }
      }

      if (isCollapsed) return;

      for (const ent of scene.entities) {
        const entKey = `inspect-ent-${ent.id}`;
        const entInspecting = this.inspecting[entKey];

        const entRow = new UIPanel({ direction: 'horizontal', transparent: true, padding: 0 });
        entRow.add(new UIButton(
          `${indent}    #${ent.id} ${ent.tag} [${ent.groups.join(', ')}]`,
          () => engine.removeEntityById(ent.id),
          { color: '#60fcfc', hoverColor: '#ff4444', font: '11px monospace' }
        ));
        entRow.add(new UIButton(
          '?',
          () => { this.inspecting[entKey] = !this.inspecting[entKey]; },
          { color: entInspecting ? '#ffffff' : '#555555', hoverColor: '#ffffff', font: '11px monospace' }
        ));
        this.panel.add(entRow);

        if (entInspecting) {
          const entity = engine.getEntity(ent.id);
          if (entity) {
            addProperties(entity, `${indent}          `);
          }
        }
      }

      for (const child of scene.children) {
        addScene(child, depth + 1);
      }
    };

    for (const scene of tree) {
      addScene(scene, 0);
    }

    this.panel.draw(ctx);
  }
}