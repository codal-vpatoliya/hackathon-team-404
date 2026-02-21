/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function parseSanitySchema(schemaJson: any[]) {
  let nodes: any[] = [];
  let edges: any[] = [];

  // Helper function to check if a schema is user-created vs Sanity system
  const isCustomType = (name: string) => {
    if (!name) return false;
    // Ignore anything starting with 'sanity.' and specific built-ins
    const ignoredTypes = ["slug", "geopoint"];
    return !name.startsWith("sanity.") && !ignoredTypes.includes(name);
  };

  const isCompiledAST = schemaJson.some(
    (item) => item.attributes || item.value?.attributes,
  );

  // ==========================================
  // PARSER A: COMPILED AST FORMAT
  // ==========================================
  if (isCompiledAST) {
    const refMap: Record<string, string> = {};
    schemaJson.forEach((item) => {
      if (item.type === "type" && item.value?.dereferencesTo) {
        refMap[item.name] = item.value.dereferencesTo;
      }
    });

    // FILTER APPLIED HERE: Only keep Document/Object types that are CUSTOM
    const validNodes = schemaJson.filter((item) => {
      const isDocOrObj =
        item.type === "document" ||
        (item.type === "type" &&
          item.value?.type === "object" &&
          !item.value?.dereferencesTo);
      return isDocOrObj && isCustomType(item.name);
    });

    let nodeIndex = 0;

    validNodes.forEach((typeDef) => {
      const nodeId = typeDef.name;
      const attributes = typeDef.attributes || typeDef.value?.attributes || {};
      const fields: any[] = [];

      const findEdges = (attrs: any, currentPath: string) => {
        if (!attrs) return;

        Object.entries(attrs).forEach(([key, def]: [string, any]) => {
          const val = def.value;
          if (!val) return;

          const edgeLabel = currentPath ? `${currentPath}.${key}` : key;

          if (val.type === "inline") {
            const targetName = val.name;

            if (refMap[targetName]) {
              edges.push({
                id: `e-${nodeId}-${refMap[targetName]}-${edgeLabel}`,
                source: nodeId,
                target: refMap[targetName],
                label: edgeLabel,
                type: "smoothstep",
                animated: true,
              });
            } else {
              edges.push({
                id: `e-${nodeId}-${targetName}-${edgeLabel}`,
                source: nodeId,
                target: targetName,
                label: edgeLabel,
                type: "smoothstep",
                style: { strokeDasharray: "5,5" },
              });
            }
          } else if (val.type === "object" && val.attributes) {
            findEdges(val.attributes, edgeLabel);
          }
        });
      };

      Object.entries(attributes).forEach(
        ([fieldKey, fieldDef]: [string, any]) => {
          if (fieldKey.startsWith("_")) return;

          let fieldType = fieldDef.value?.type || "unknown";
          if (fieldType === "inline") {
            const inlineName = fieldDef.value?.name;
            fieldType = refMap[inlineName] ? `reference` : inlineName;
          }

          fields.push({ name: fieldKey, type: fieldType });
        },
      );

      findEdges(attributes, "");

      nodes.push({
        id: nodeId,
        position: {
          x: (nodeIndex % 3) * 450,
          y: Math.floor(nodeIndex / 3) * 500,
        },
        data: { label: nodeId, fields: fields },
        type: "schemaNode",
      });

      nodeIndex++;
    });
  }
  // ==========================================
  // PARSER B: ORIGINAL SANITY FORMAT
  // ==========================================
  else {
    schemaJson.forEach((typeDef, index) => {
      // FILTER APPLIED HERE AS WELL
      if (typeDef.type === "document" && isCustomType(typeDef.name)) {
        nodes.push({
          id: typeDef.name,
          position: { x: (index % 3) * 450, y: Math.floor(index / 3) * 500 },
          data: {
            label: typeDef.title || typeDef.name,
            fields: Array.isArray(typeDef.fields)
              ? typeDef.fields.map((f: any) => ({ name: f.name, type: f.type }))
              : [],
          },
          type: "schemaNode",
        });

        if (Array.isArray(typeDef.fields)) {
          typeDef.fields.forEach((field: any) => {
            if (field.type === "reference" && Array.isArray(field.to)) {
              field.to.forEach((ref: any) => {
                edges.push({
                  id: `e-${typeDef.name}-${ref.type}-${field.name}`,
                  source: typeDef.name,
                  target: ref.type,
                  label: field.name,
                  type: "smoothstep",
                  animated: true,
                });
              });
            } else if (field.type === "array" && Array.isArray(field.of)) {
              field.of.forEach((item: any) => {
                if (item.type === "reference" && Array.isArray(item.to)) {
                  item.to.forEach((ref: any) => {
                    edges.push({
                      id: `e-${typeDef.name}-${ref.type}-array-${field.name}`,
                      source: typeDef.name,
                      target: ref.type,
                      label: `[${field.name}]`,
                      type: "smoothstep",
                      animated: true,
                      style: { strokeDasharray: "5,5" },
                    });
                  });
                }
              });
            }
          });
        }
      }
    });
  }

  // ==========================================
  // FINAL CLEANUP: ORPHANED EDGE REMOVAL
  // ==========================================
  // Because we filtered out system nodes (like sanity.imageAsset),
  // we might have created edges pointing to nodes that no longer exist.
  // React Flow will throw errors if an edge points to a missing node.
  const validNodeIds = new Set(nodes.map((n) => n.id));
  edges = edges.filter(
    (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target),
  );

  return { nodes, edges };
}
