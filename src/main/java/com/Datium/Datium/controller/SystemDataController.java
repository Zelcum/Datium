package com.Datium.Datium.controller;

import com.Datium.Datium.dto.*;
import com.Datium.Datium.service.SystemDataService;
import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sistemas/{systemId}")
@CrossOrigin(origins = "*")
public class SystemDataController {

    @Autowired
    private SystemDataService systemDataService;

    @Autowired
    private JwtUtil jwtUtil;

    private Integer getUserIdFromToken(String token) {
        if (token == null) return null;
        if (!token.startsWith("Bearer ")) {
            try {
                return jwtUtil.extractUserId(token);
            } catch (Exception e) {
                return null;
            }
        }
        try {
            String jwt = token.substring(7);
            return jwtUtil.extractUserId(jwt);
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping("/campos")
    public ResponseEntity<?> getFields(
            @PathVariable Integer systemId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            List<SystemFieldResponse> fields = systemDataService.getFields(systemId, userId);
            return ResponseEntity.ok(fields);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/campos")
    public ResponseEntity<?> createField(
            @PathVariable Integer systemId,
            @RequestBody SystemFieldRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            SystemFieldResponse field = systemDataService.createField(systemId, request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(field);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/campos/{fieldId}")
    public ResponseEntity<?> updateField(
            @PathVariable Integer systemId,
            @PathVariable Integer fieldId,
            @RequestBody SystemFieldRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            SystemFieldResponse field = systemDataService.updateField(systemId, fieldId, request, userId);
            return ResponseEntity.ok(field);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/campos/{fieldId}")
    public ResponseEntity<Void> deleteField(
            @PathVariable Integer systemId,
            @PathVariable Integer fieldId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            systemDataService.deleteField(systemId, fieldId, userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/registros")
    public ResponseEntity<?> getRecords(
            @PathVariable Integer systemId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            List<SystemRecordResponse> records = systemDataService.getRecords(systemId, userId);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/registros")
    public ResponseEntity<?> createRecord(
            @PathVariable Integer systemId,
            @RequestBody SystemRecordRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            SystemRecordResponse record = systemDataService.createRecord(systemId, request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(record);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/registros/{recordId}")
    public ResponseEntity<?> updateRecord(
            @PathVariable Integer systemId,
            @PathVariable Integer recordId,
            @RequestBody SystemRecordRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            SystemRecordResponse record = systemDataService.updateRecord(systemId, recordId, request, userId);
            return ResponseEntity.ok(record);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/registros/{recordId}")
    public ResponseEntity<Void> deleteRecord(
            @PathVariable Integer systemId,
            @PathVariable Integer recordId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            systemDataService.deleteRecord(systemId, recordId, userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/campos/transferir")
    public ResponseEntity<?> transferFields(
            @PathVariable Integer systemId,
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            @SuppressWarnings("unchecked")
            List<Integer> fieldIds = (List<Integer>) request.get("fieldIds");
            Integer targetSystemId = (Integer) request.get("targetSystemId");
            
            if (fieldIds == null || fieldIds.isEmpty() || targetSystemId == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{\"error\":\"fieldIds y targetSystemId son requeridos\"}");
            }
            
            int transferredRecords = systemDataService.transferFields(systemId, fieldIds, targetSystemId, userId);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Campos transferidos exitosamente");
            response.put("transferredRecords", transferredRecords);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/campos/disponibles-importar")
    public ResponseEntity<?> getAvailableFieldsToImport(
            @PathVariable Integer systemId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            List<Map<String, Object>> availableFields = systemDataService.getAvailableFieldsToImport(systemId, userId);
            return ResponseEntity.ok(availableFields);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    @PostMapping("/campos/importar")
    public ResponseEntity<?> importFields(
            @PathVariable Integer systemId,
            @RequestBody Map<String, Object> request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            @SuppressWarnings("unchecked")
            List<Integer> fieldIds = (List<Integer>) request.get("fieldIds");
            Integer sourceSystemId = (Integer) request.get("sourceSystemId");
            
            if (fieldIds == null || fieldIds.isEmpty() || sourceSystemId == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{\"error\":\"fieldIds y sourceSystemId son requeridos\"}");
            }
            
            int transferredRecords = systemDataService.importFields(systemId, sourceSystemId, fieldIds, userId);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Campos importados exitosamente");
            response.put("transferredRecords", transferredRecords);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}


