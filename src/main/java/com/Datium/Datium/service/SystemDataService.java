package com.Datium.Datium.service;

import com.Datium.Datium.dto.*;
import com.Datium.Datium.entity.*;
import com.Datium.Datium.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SystemDataService {

    @Autowired
    private SystemRepository systemRepository;

    @Autowired
    private SystemFieldRepository systemFieldRepository;

    @Autowired
    private SystemFieldOptionRepository systemFieldOptionRepository;

    @Autowired
    private SystemRecordRepository systemRecordRepository;

    @Autowired
    private SystemRecordValueRepository systemRecordValueRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private SystemTableRepository systemTableRepository;

    @Autowired
    private SystemUserRepository systemUserRepository;

    private boolean hasPermission(Integer systemId, Integer userId, String action) {
        com.Datium.Datium.entity.System system = systemRepository.findById(systemId)
            .orElseThrow(() -> new RuntimeException("Sistema no encontrado"));
        
        if (system.getOwnerId().equals(userId)) {
            return true;
        }
        
        SystemUser systemUser = systemUserRepository.findBySystemIdAndUserId(systemId, userId)
            .orElse(null);
        
        if (systemUser == null) {
            return false;
        }
        
        SystemUser.Role role = systemUser.getRole();
        
        switch (action) {
            case "manage_fields":
                return role == SystemUser.Role.admin;
            case "create_record":
            case "update_record":
            case "delete_record":
                return role == SystemUser.Role.admin || role == SystemUser.Role.editor;
            case "view":
                return true;
            default:
                return false;
        }
    }

    public List<SystemFieldResponse> getFields(Integer systemId, Integer userId) {
        if (!hasPermission(systemId, userId, "view")) {
            throw new RuntimeException("No tienes permisos para ver los campos");
        }
        
        List<SystemField> fields = systemFieldRepository.findBySystemIdOrderByOrderIndexAsc(systemId);
        return fields.stream().map(this::convertToFieldResponse).collect(Collectors.toList());
    }

    @Transactional
    public SystemFieldResponse createField(Integer systemId, SystemFieldRequest request, Integer userId) {
        if (!hasPermission(systemId, userId, "manage_fields")) {
            throw new RuntimeException("No tienes permisos para crear campos");
        }
        
        SystemField field = new SystemField();
        field.setSystemId(systemId);
        field.setName(request.getName());
        field.setType(request.getType());
        field.setRequired(request.getRequired() != null ? request.getRequired() : false);
        field.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        
        field = systemFieldRepository.save(field);
        
        if (request.getOptions() != null && !request.getOptions().isEmpty()) {
            for (String optionValue : request.getOptions()) {
                SystemFieldOption option = new SystemFieldOption();
                option.setFieldId(field.getId());
                option.setValue(optionValue.trim());
                systemFieldOptionRepository.save(option);
            }
        }
        
        return convertToFieldResponse(field);
    }

    @Transactional
    public SystemFieldResponse updateField(Integer systemId, Integer fieldId, SystemFieldRequest request, Integer userId) {
        if (!hasPermission(systemId, userId, "manage_fields")) {
            throw new RuntimeException("No tienes permisos para actualizar campos");
        }
        
        SystemField field = systemFieldRepository.findById(fieldId)
            .orElseThrow(() -> new RuntimeException("Campo no encontrado"));
        
        if (!field.getSystemId().equals(systemId)) {
            throw new RuntimeException("El campo no pertenece a este sistema");
        }
        
        field.setName(request.getName());
        field.setType(request.getType());
        field.setRequired(request.getRequired() != null ? request.getRequired() : false);
        field.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        
        systemFieldOptionRepository.deleteByFieldId(fieldId);
        
        if (request.getOptions() != null && !request.getOptions().isEmpty()) {
            for (String optionValue : request.getOptions()) {
                SystemFieldOption option = new SystemFieldOption();
                option.setFieldId(field.getId());
                option.setValue(optionValue.trim());
                systemFieldOptionRepository.save(option);
            }
        }
        
        field = systemFieldRepository.save(field);
        return convertToFieldResponse(field);
    }

    @Transactional
    public void deleteField(Integer systemId, Integer fieldId, Integer userId) {
        if (!hasPermission(systemId, userId, "manage_fields")) {
            throw new RuntimeException("No tienes permisos para eliminar campos");
        }
        
        SystemField field = systemFieldRepository.findById(fieldId)
            .orElseThrow(() -> new RuntimeException("Campo no encontrado"));
        
        if (!field.getSystemId().equals(systemId)) {
            throw new RuntimeException("El campo no pertenece a este sistema");
        }
        
        systemFieldOptionRepository.deleteByFieldId(fieldId);
        systemFieldRepository.delete(field);
    }

    public List<SystemRecordResponse> getRecords(Integer systemId, Integer userId) {
        if (!hasPermission(systemId, userId, "view")) {
            throw new RuntimeException("No tienes permisos para ver los registros");
        }
        
        List<SystemRecord> records = systemRecordRepository.findBySystemId(systemId);
        return records.stream().map(record -> convertToRecordResponse(record, systemId)).collect(Collectors.toList());
    }

    private void validateFieldValues(Integer systemId, Map<String, String> fieldValues, Map<String, Integer> fieldNameToId) {
        if (fieldValues == null || fieldValues.isEmpty()) return;

        // Get all relationships for this system to check FKs
        List<SystemRelationship> relationships = systemRelationshipRepository.findBySystemId(systemId);
        Map<Integer, SystemRelationship> fieldRelMap = new HashMap<>(); // FromFieldId -> Rel
        for (SystemRelationship rel : relationships) {
            fieldRelMap.put(rel.getFromFieldId(), rel);
        }

        for (Map.Entry<String, String> entry : fieldValues.entrySet()) {
            Integer fieldId = fieldNameToId.get(entry.getKey());
            if (fieldId != null && fieldRelMap.containsKey(fieldId)) {
                SystemRelationship rel = fieldRelMap.get(fieldId);
                String value = entry.getValue();
                if (value != null && !value.isEmpty()) {
                    try {
                        Integer targetRecordId = Integer.parseInt(value);
                        // Check if record exists in target table
                        boolean exists = systemRecordRepository.existsById(targetRecordId);
                        if (!exists) {
                            throw new RuntimeException("El valor '" + value + "' para el campo '" + entry.getKey() + "' no existe en la tabla relacionada.");
                        }
                        // Optionally check if record belongs to target table (systemRecordRepository.findById(...) check tableId)
                        SystemRecord targetRecord = systemRecordRepository.findById(targetRecordId).orElse(null);
                        if (targetRecord == null || !targetRecord.getTableId().equals(rel.getToTableId())) {
                             throw new RuntimeException("El registro referenciado no pertenece a la tabla correcta.");
                        }

                    } catch (NumberFormatException e) {
                         throw new RuntimeException("El valor para el campo relación '" + entry.getKey() + "' debe ser un ID numérico válido.");
                    }
                }
            }
        }
    }

    @Transactional
    public SystemRecordResponse createRecord(Integer systemId, SystemRecordRequest request, Integer userId) {
        if (!hasPermission(systemId, userId, "create_record")) {
            throw new RuntimeException("No tienes permisos para crear registros");
        }
        
        List<SystemField> fields = systemFieldRepository.findBySystemIdOrderByOrderIndexAsc(systemId);
        Map<String, Integer> fieldNameToId = new HashMap<>();
        for (SystemField field : fields) {
            fieldNameToId.put(field.getName(), field.getId());
        }

        // Validate FKs
        validateFieldValues(systemId, request.getFieldValues(), fieldNameToId);
        
        SystemRecord record = new SystemRecord();
        record.setSystemId(systemId);
        record.setCreatedBy(userId);
        record = systemRecordRepository.save(record);
        
        if (request.getFieldValues() != null) {
            for (Map.Entry<String, String> entry : request.getFieldValues().entrySet()) {
                Integer fieldId = fieldNameToId.get(entry.getKey());
                if (fieldId != null) {
                    SystemRecordValue value = new SystemRecordValue();
                    value.setRecordId(record.getId());
                    value.setFieldId(fieldId);
                    value.setValue(entry.getValue());
                    systemRecordValueRepository.save(value);
                }
            }
        }
        
        return convertToRecordResponse(record, systemId);
    }

    @Transactional
    public SystemRecordResponse updateRecord(Integer systemId, Integer recordId, SystemRecordRequest request, Integer userId) {
        if (!hasPermission(systemId, userId, "update_record")) {
            throw new RuntimeException("No tienes permisos para actualizar registros");
        }
        
        SystemRecord record = systemRecordRepository.findById(recordId)
            .orElseThrow(() -> new RuntimeException("Registro no encontrado"));
        
        if (!record.getSystemId().equals(systemId)) {
            throw new RuntimeException("El registro no pertenece a este sistema");
        }
        
        List<SystemField> fields = systemFieldRepository.findBySystemIdOrderByOrderIndexAsc(systemId);
        Map<String, Integer> fieldNameToId = new HashMap<>();
        for (SystemField field : fields) {
            fieldNameToId.put(field.getName(), field.getId());
        }

         // Validate FKs
        validateFieldValues(systemId, request.getFieldValues(), fieldNameToId);
        
        record = systemRecordRepository.save(record);
        
        systemRecordValueRepository.deleteByRecordId(recordId);
        entityManager.flush();
        entityManager.clear();
        
        if (request.getFieldValues() != null) {
            for (Map.Entry<String, String> entry : request.getFieldValues().entrySet()) {
                Integer fieldId = fieldNameToId.get(entry.getKey());
                if (fieldId != null && entry.getValue() != null) {
                    SystemRecordValue value = new SystemRecordValue();
                    value.setRecordId(record.getId());
                    value.setFieldId(fieldId);
                    value.setValue(entry.getValue());
                    systemRecordValueRepository.save(value);
                }
            }
        }
        
        return convertToRecordResponse(record, systemId);
    }

    @Transactional
    // Old deleteRecord removed to encourage usage of cascade-enabled version


    private SystemFieldResponse convertToFieldResponse(SystemField field) {
        SystemFieldResponse response = new SystemFieldResponse();
        response.setId(field.getId());
        response.setName(field.getName());
        response.setType(field.getType());
        response.setRequired(field.getRequired());
        response.setOrderIndex(field.getOrderIndex());
        response.setCreatedAt(field.getCreatedAt());
        
        List<SystemFieldOption> options = systemFieldOptionRepository.findByFieldId(field.getId());
        response.setOptions(options.stream().map(SystemFieldOption::getValue).collect(Collectors.toList()));
        
        return response;
    }

    private SystemRecordResponse convertToRecordResponse(SystemRecord record, Integer systemId) {
        SystemRecordResponse response = new SystemRecordResponse();
        response.setId(record.getId());
        response.setCreatedAt(record.getCreatedAt());
        response.setUpdatedAt(record.getUpdatedAt());
        
        List<SystemRecordValue> values = systemRecordValueRepository.findByRecordId(record.getId());
        List<SystemField> fields = systemFieldRepository.findBySystemIdOrderByOrderIndexAsc(systemId);
        
        Map<Integer, String> fieldIdToName = new HashMap<>();
        for (SystemField field : fields) {
            fieldIdToName.put(field.getId(), field.getName());
        }
        
        Map<String, String> fieldValues = new HashMap<>();
        for (SystemRecordValue value : values) {
            String fieldName = fieldIdToName.get(value.getFieldId());
            if (fieldName != null) {
                fieldValues.put(fieldName, value.getValue());
            }
        }
        
        response.setFieldValues(fieldValues);
        return response;
    }

    // --- TABLE BASED OPERATIONS ---

    @Autowired
    private SystemRelationshipRepository systemRelationshipRepository;

    public List<SystemFieldResponse> getFieldsByTable(Integer tableId, Integer userId) {
        // TODO: Validate user access to the system containing the table
        List<SystemField> fields = systemFieldRepository.findByTableIdOrderByOrderIndexAsc(tableId);
        List<SystemRelationship> relationships = systemRelationshipRepository.findByFromTableId(tableId);
        
        // Map fieldId -> Relationship
        Map<Integer, SystemRelationship> fieldRelMap = new HashMap<>();
        for (SystemRelationship rel : relationships) {
            fieldRelMap.put(rel.getFromFieldId(), rel);
        }

        return fields.stream().map(f -> {
            SystemFieldResponse r = convertToFieldResponse(f);
            if (fieldRelMap.containsKey(f.getId())) {
                SystemRelationship rel = fieldRelMap.get(f.getId());
                r.setRelatedTableId(rel.getToTableId());
                
                // Fetch the name of the display field
                if (rel.getToFieldId() != null) {
                   systemFieldRepository.findById(rel.getToFieldId())
                           .ifPresent(relatedField -> r.setRelatedFieldName(relatedField.getName()));
                }
            }
            return r;
        }).collect(Collectors.toList());
    }

    @Autowired
    private PlanValidationService planValidationService;

    @Transactional
    public SystemFieldResponse createFieldForTable(Integer tableId, SystemFieldRequest request, Integer userId) {
         com.Datium.Datium.entity.SystemTable table = systemTableRepository.findById(tableId)
                 .orElseThrow(() -> new RuntimeException("Tabla no encontrada"));
         
         // Validate Plan Limit
         planValidationService.validateFieldLimit(table.getSystemId());
         
         // TODO: Validate Permissions

        SystemField field = new SystemField();
        field.setSystemId(table.getSystemId());
        field.setTableId(tableId);
        field.setName(request.getName());
        field.setType(request.getType());
        field.setRequired(request.getRequired());
        
        if (request.getOrderIndex() != null) {
            field.setOrderIndex(request.getOrderIndex());
        } else {
            Integer maxOrder = systemFieldRepository.findMaxOrderIndexByTableId(tableId);
            field.setOrderIndex(maxOrder != null ? maxOrder + 1 : 0);
        }

        field = systemFieldRepository.save(field);
        
        if (request.getOptions() != null && !request.getOptions().isEmpty()) {
            for (String optionValue : request.getOptions()) {
                SystemFieldOption option = new SystemFieldOption();
                option.setFieldId(field.getId());
                option.setValue(optionValue);
                systemFieldOptionRepository.save(option);
            }
        }

        if ("relation".equals(request.getType())) {
            if (request.getRelatedTableId() == null) {
                throw new IllegalArgumentException("Related Table ID is required for relation fields");
            }

            SystemRelationship rel = new SystemRelationship();
            rel.setSystemId(table.getSystemId());
            rel.setFromTableId(tableId);
            rel.setFromFieldId(field.getId());
            rel.setToTableId(request.getRelatedTableId());
            
            if(request.getRelatedDisplayFieldId() != null) {
                rel.setToFieldId(request.getRelatedDisplayFieldId());
            } else {
                rel.setToFieldId(0); 
            }
            rel.setType(SystemRelationship.RelationshipType.ONE_TO_MANY); 
            systemRelationshipRepository.save(rel);
        }
        
        return convertToFieldResponse(field);
    }


    public List<SystemRecordResponse> getRecordsByTable(Integer tableId, Integer userId) {
        List<SystemRecord> records = systemRecordRepository.findByTableId(tableId);
        return records.stream().map(this::convertToRecordResponse).collect(Collectors.toList());
    }


    @Transactional
    public SystemRecordResponse createRecordForTable(Integer tableId, SystemRecordRequest request, Integer userId) {
         com.Datium.Datium.entity.SystemTable table = systemTableRepository.findById(tableId)
                 .orElseThrow(() -> new RuntimeException("Tabla no encontrada"));

        // Validate Plan Limit
        planValidationService.validateRecordLimit(table.getSystemId());

        SystemRecord record = new SystemRecord();
        record.setSystemId(table.getSystemId());
        record.setTableId(tableId);
        record.setCreatedBy(userId);
        record = systemRecordRepository.save(record);

        // Validate values
        if (request.getValues() != null) {
            List<SystemRelationship> relationships = systemRelationshipRepository.findByFromTableId(tableId);
            Map<Integer, SystemRelationship> fieldRelMap = new HashMap<>();
            for (SystemRelationship rel : relationships) {
                fieldRelMap.put(rel.getFromFieldId(), rel);
            }

            for (Map.Entry<Integer, Object> entry : request.getValues().entrySet()) {
                Integer fieldId = entry.getKey();
                Object valueObj = entry.getValue();
                
                if (fieldRelMap.containsKey(fieldId) && valueObj != null) {
                    try {
                        String valStr = valueObj.toString();
                        if(!valStr.isEmpty()) {
                            Integer targetId = Integer.parseInt(valStr);
                            SystemRelationship rel = fieldRelMap.get(fieldId);
                            // Verify target record exists and is in target table
                            SystemRecord targetRecord = systemRecordRepository.findById(targetId)
                                .orElseThrow(() -> new RuntimeException("Registro relacionado ID " + targetId + " no encontrado."));
                            
                            if (!targetRecord.getTableId().equals(rel.getToTableId())) {
                                throw new RuntimeException("El registro seleccionado no pertenece a la tabla correcta.");
                            }
                        }
                    } catch (NumberFormatException e) {
                        throw new RuntimeException("Valor inválido para campo de relación.");
                    }
                }
            }
        }

        if (request.getValues() != null) {
            for (Map.Entry<Integer, Object> entry : request.getValues().entrySet()) {
                Integer fieldId = entry.getKey();
                Object valueObj = entry.getValue();
                String value = valueObj != null ? valueObj.toString() : null;

                SystemRecordValue recordValue = new SystemRecordValue();
                recordValue.setRecordId(record.getId());
                recordValue.setFieldId(fieldId);
                recordValue.setValue(value);
                systemRecordValueRepository.save(recordValue);
            }
        }
        return convertToRecordResponse(record);
    }

    @Transactional
    public void deleteRecord(Integer recordId, Integer userId) {
        // Find record
        com.Datium.Datium.entity.SystemRecord record = systemRecordRepository.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Registro no encontrado"));
        
        // Permission check
        if (!hasPermission(record.getSystemId(), userId, "delete_record")) {
             throw new RuntimeException("No tienes permisos para eliminar registros");
        }

        Integer systemId = record.getSystemId();
        Integer tableId = record.getTableId();
        
        // --- CASCADE DELETE LOGIC ---
        // Find if this table is a target of any relationship (i.e., other tables point to this one)
        List<SystemRelationship> incomingRelationships = systemRelationshipRepository.findByToTableId(tableId);
        
        for (SystemRelationship rel : incomingRelationships) {
            // rel.getFromFieldId() is the field in the OTHER table (fromTable) that points to THIS table
            // We need to find records in 'fromTable' where 'fromField' == recordId
            
            List<SystemRecordValue> dependentValues = systemRecordValueRepository.findByFieldIdAndValue(rel.getFromFieldId(), String.valueOf(recordId));
            
            for (SystemRecordValue val : dependentValues) {
                // Recursively delete the dependent record
                // Note: We might want to check for circular dependencies or infinite loops, 
                // but for simple hierarchy, this works.
                try {
                     // We pass userId for permission check recursively
                     deleteRecord(val.getRecordId(), userId);
                } catch (Exception e) {
                    // Log error but continue? Or fail all? 
                    // Fail all is safer for data integrity.
                    throw new RuntimeException("Error al eliminar registro dependiente (Cascade): " + e.getMessage());
                }
            }
        }
        
        // Delete values first
        systemRecordValueRepository.deleteByRecordId(recordId);
        // Delete record
        systemRecordRepository.delete(record);
    }



    private SystemRecordResponse convertToRecordResponse(SystemRecord record) {
        SystemRecordResponse response = new SystemRecordResponse();
        response.setId(record.getId());
        response.setCreatedAt(record.getCreatedAt());
        response.setUpdatedAt(record.getUpdatedAt());
        
        List<SystemRecordValue> values = systemRecordValueRepository.findByRecordId(record.getId());
        List<SystemField> fields = systemFieldRepository.findByTableIdOrderByOrderIndexAsc(record.getTableId());
        
        Map<Integer, String> fieldIdToName = new HashMap<>();
        for (SystemField field : fields) {
            fieldIdToName.put(field.getId(), field.getName());
        }
        
        Map<String, String> fieldValues = new HashMap<>();
        for (SystemRecordValue value : values) {
            String fieldName = fieldIdToName.get(value.getFieldId());
            if (fieldName != null) {
                fieldValues.put(fieldName, value.getValue());
            }
        }
        
        response.setFieldValues(fieldValues);
        return response;
    }


    private void validateRequiredFields(Integer systemId, Map<Integer, Object> values, List<SystemField> fields) {
        for (SystemField field : fields) {
            if (field.getRequired()) {
                Object val = values.get(field.getId());
                if (val == null || val.toString().trim().isEmpty()) {
                    throw new RuntimeException("El campo '" + field.getName() + "' es obligatorio.");
                }
            }
        }
    }

    @Transactional
    public SystemRecordResponse updateRecord(Integer recordId, SystemRecordRequest request, Integer userId) {
        SystemRecord record = systemRecordRepository.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Registro no encontrado"));
        
        Integer tableId = record.getTableId();
        List<SystemField> fields = systemFieldRepository.findByTableIdOrderByOrderIndexAsc(tableId);

        // Validate values
        if (request.getValues() != null) {
            // Validate Required Fields
             // Merge existing values with new values for validation? 
             // Or just validate input? Usually inputs to update are partial. 
             // But if specific field is required and we send empty, it should fail.
             // If we don't send it, it keeps underlying value.
             // Let's check: if key exists in map (even if null/empty), checking.
             // If key not in map, we assume old value persists.
             
             // However, for strictness, let's fetch current values to check full state?
             // That's heavier. 
             // Let's just check if the incoming change violates requiredness.
             
            for (SystemField field : fields) {
                if (field.getRequired() && request.getValues().containsKey(field.getId())) {
                    Object val = request.getValues().get(field.getId());
                    if (val == null || val.toString().trim().isEmpty()) {
                        throw new RuntimeException("El campo '" + field.getName() + "' es obligatorio.");
                    }
                }
            }

            List<SystemRelationship> relationships = systemRelationshipRepository.findByFromTableId(tableId);
            Map<Integer, SystemRelationship> fieldRelMap = new HashMap<>();
            for (SystemRelationship rel : relationships) {
                fieldRelMap.put(rel.getFromFieldId(), rel);
            }

            for (Map.Entry<Integer, Object> entry : request.getValues().entrySet()) {
                Integer fieldId = entry.getKey();
                Object valueObj = entry.getValue();
                
                if (fieldRelMap.containsKey(fieldId) && valueObj != null) {
                    try {
                        String valStr = valueObj.toString();
                        if(!valStr.isEmpty()) {
                            Integer targetId = Integer.parseInt(valStr);
                            SystemRelationship rel = fieldRelMap.get(fieldId);
                            SystemRecord targetRecord = systemRecordRepository.findById(targetId)
                                .orElseThrow(() -> new RuntimeException("Registro relacionado ID " + targetId + " no encontrado."));
                            
                            if (!targetRecord.getTableId().equals(rel.getToTableId())) {
                                throw new RuntimeException("El registro seleccionado no pertenece a la tabla correcta.");
                            }
                        }
                    } catch (NumberFormatException e) {
                        throw new RuntimeException("Valor inválido para campo de relación.");
                    }
                }
            }
        }

        // Update values
        if (request.getValues() != null) {
            for (Map.Entry<Integer, Object> entry : request.getValues().entrySet()) {
                Integer fieldId = entry.getKey();
                Object valueObj = entry.getValue();
                String value = valueObj != null ? valueObj.toString() : null;

                SystemRecordValue recordValue = systemRecordValueRepository.findByRecordIdAndFieldId(recordId, fieldId).orElse(null);
                if (recordValue == null) {
                     if (value != null) {
                         recordValue = new SystemRecordValue();
                         recordValue.setRecordId(recordId);
                         recordValue.setFieldId(fieldId);
                         recordValue.setValue(value);
                         systemRecordValueRepository.save(recordValue);
                     }
                } else {
                    if (value == null) {
                        systemRecordValueRepository.delete(recordValue);
                    } else {
                        recordValue.setValue(value);
                        systemRecordValueRepository.save(recordValue);
                    }
                }
            }
        }
        
        record.setUpdatedAt(java.time.LocalDateTime.now());
        return convertToRecordResponse(record);
    }
}

