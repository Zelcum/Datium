package com.Datium.Datium.service;

import com.Datium.Datium.dto.*;
import com.Datium.Datium.entity.*;
import com.Datium.Datium.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.io.ByteArrayOutputStream;

// POI & PDF
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.PdfPTable;


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



    private Map<String, Map<String, String>> resolveRelationDisplayValues(Integer tableId, List<SystemFieldResponse> fields, List<SystemRecordResponse> records) {
        Map<String, Map<String, String>> resolvedMap = new HashMap<>(); // FieldName -> (RecordID -> DisplayValue)

        // 1. Identify relation fields and their config
        List<SystemRelationship> relationships = systemRelationshipRepository.findByFromTableId(tableId);
        Map<Integer, SystemRelationship> fieldRelMap = new HashMap<>();
        for (SystemRelationship rel : relationships) {
            fieldRelMap.put(rel.getFromFieldId(), rel);
        }

        for (SystemFieldResponse field : fields) {
            if ("relation".equalsIgnoreCase(field.getType()) && fieldRelMap.containsKey(field.getId())) {
                SystemRelationship rel = fieldRelMap.get(field.getId());
                Integer targetDisplayFieldId = rel.getToFieldId(); // Field ID in target table to display
                
                if (targetDisplayFieldId == null || targetDisplayFieldId == 0) continue;

                // 2. Collect all FK IDs from records for this field
                List<Integer> targetRecordIds = new ArrayList<>();
                for (SystemRecordResponse record : records) {
                    String val = record.getFieldValues().get(field.getName());
                    if (val != null && !val.isEmpty()) {
                        try {
                            targetRecordIds.add(Integer.parseInt(val));
                        } catch (NumberFormatException ignored) {}
                    }
                }

                if (targetRecordIds.isEmpty()) continue;

                // 3. Query target values
                Map<String, String> valueMap = new HashMap<>();
                List<Integer> distinctIds = targetRecordIds.stream().distinct().collect(Collectors.toList());
                
                for (Integer targetId : distinctIds) {
                    systemRecordValueRepository.findByRecordIdAndFieldId(targetId, targetDisplayFieldId)
                        .ifPresent(val -> valueMap.put(String.valueOf(targetId), val.getValue()));
                }
                
                resolvedMap.put(field.getName(), valueMap);
            }
        }
        return resolvedMap;
    }

    public byte[] exportTableToCsv(Integer tableId, Integer userId) {
        // Fetch Metadata and Data
        List<SystemFieldResponse> fields = getFieldsByTable(tableId, userId);
        List<SystemRecordResponse> records = getRecordsByTable(tableId, userId);
        
        // Resolve Relations
        Map<String, Map<String, String>> resolvedValues = resolveRelationDisplayValues(tableId, fields, records);

        StringBuilder csv = new StringBuilder();
        // UTF-8 BOM for Excel compatibility
        csv.append("\uFEFF");

        // Header
        csv.append("ID");
        for (SystemFieldResponse field : fields) {
            csv.append(";").append(escapeCsv(field.getName()));
        }
        csv.append("\n");

        // Rows
        for (SystemRecordResponse record : records) {
            csv.append(record.getId());
            for (SystemFieldResponse field : fields) {
                String val = record.getFieldValues().get(field.getName());
                
                // Check for resolved value
                if (resolvedValues.containsKey(field.getName()) && val != null) {
                    String resolved = resolvedValues.get(field.getName()).get(val);
                    if (resolved != null) val = resolved;
                }
                
                csv.append(";").append(escapeCsv(val));
            }
            csv.append("\n");
        }

        return csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    public byte[] exportTableToExcel(Integer tableId, Integer userId) {
        List<SystemFieldResponse> fields = getFieldsByTable(tableId, userId);
        List<SystemRecordResponse> records = getRecordsByTable(tableId, userId);
        
        // Resolve Relations
        Map<String, Map<String, String>> resolvedValues = resolveRelationDisplayValues(tableId, fields, records);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Data");
            
            // Header
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("ID");
            for (int i = 0; i < fields.size(); i++) {
                headerRow.createCell(i + 1).setCellValue(fields.get(i).getName());
            }

            // Data
            int rowNum = 1;
            for (SystemRecordResponse record : records) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(record.getId());
                for (int i = 0; i < fields.size(); i++) {
                    String val = record.getFieldValues().get(fields.get(i).getName());
                    
                    // Check for resolved value
                    if (resolvedValues.containsKey(fields.get(i).getName()) && val != null) {
                        String resolved = resolvedValues.get(fields.get(i).getName()).get(val);
                        if (resolved != null) val = resolved;
                    }
                    
                    row.createCell(i + 1).setCellValue(val != null ? val : "");
                }
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error creando Excel: " + e.getMessage());
        }
    }

    public byte[] exportTableToPdf(Integer tableId, Integer userId) {
        List<SystemFieldResponse> fields = getFieldsByTable(tableId, userId);
        List<SystemRecordResponse> records = getRecordsByTable(tableId, userId);
        
        // Resolve Relations
        Map<String, Map<String, String>> resolvedValues = resolveRelationDisplayValues(tableId, fields, records);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            // Meta
            document.add(new Paragraph("Reporte de Tabla (ID: " + tableId + ")"));
            document.add(new Paragraph("Generado el: " + new Date()));
            document.add(new Paragraph(" ")); // Spacer

            // Table
            int numCols = fields.size() + 1;
            PdfPTable table = new PdfPTable(numCols);
            table.setWidthPercentage(100);

            // Headers
            table.addCell("ID");
            for (SystemFieldResponse field : fields) {
                table.addCell(field.getName());
            }

            // Rows
            for (SystemRecordResponse record : records) {
                table.addCell(String.valueOf(record.getId()));
                for (SystemFieldResponse field : fields) {
                    String val = record.getFieldValues().get(field.getName());
                    
                    // Check for resolved value
                    if (resolvedValues.containsKey(field.getName()) && val != null) {
                        String resolved = resolvedValues.get(field.getName()).get(val);
                        if (resolved != null) val = resolved;
                    }
                    
                    table.addCell(val != null ? val : "");
                }
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error creando PDF: " + e.getMessage());
        }
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        String escaped = val.replace("\"", "\"\"");
        // Force quotes for safety and use semicolon for Excel region compat mostly?
        // User complained about "rare characters". 
        // BOM \uFEFF + Standard Comma is usually best for standard CSV.
        // But some Spanish Excels prefer Semicolon. 
        // Let's stick to standard CSV (semicolon in replacement logic above) 
        // to be safe I switched to semicolon in the generator above to handle European locales better?
        // Actually, standard CSV uses comma. If I use semicolon, I should call it CSV (European).
        // Let's stick to semicolon separated if user is spanish (likely), or Comma.
        // User said "letters with tilde look weird" -> This is purely ENCODING. BOM fixes it.
        // I will revert to comma but keep BOM.
        
        if (escaped.contains(";") || escaped.contains("\n") || escaped.contains("\"")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}

