package com.Datium.Datium.controller;

import com.Datium.Datium.dto.*;
import com.Datium.Datium.service.SystemTableService;
import com.Datium.Datium.service.SystemDataService;
import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sistemas/{systemId}/tablas")
@CrossOrigin(origins = "*")
public class SystemTableController {

    @Autowired
    private SystemTableService systemTableService;

    @Autowired
    private SystemDataService systemDataService;

    @Autowired
    private JwtUtil jwtUtil;

    private Integer getUserIdFromToken(String token) {
        if (token == null)
            return null;
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

    @GetMapping
    public ResponseEntity<?> getAllTables(
            @PathVariable Integer systemId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            List<SystemTableResponse> tables = systemTableService.getAllTables(systemId, userId);
            return ResponseEntity.ok(tables);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{tableId}")
    public ResponseEntity<?> getTableById(
            @PathVariable Integer systemId,
            @PathVariable Integer tableId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            SystemTableResponse table = systemTableService.getTableById(systemId, tableId, userId);
            return ResponseEntity.ok(table);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createTable(
            @PathVariable Integer systemId,
            @RequestBody SystemTableRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            SystemTableResponse table = systemTableService.createTable(systemId, request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(table);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{tableId}")
    public ResponseEntity<?> updateTable(
            @PathVariable Integer systemId,
            @PathVariable Integer tableId,
            @RequestBody SystemTableRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            SystemTableResponse table = systemTableService.updateTable(systemId, tableId, request, userId);
            return ResponseEntity.ok(table);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{tableId}")
    public ResponseEntity<Void> deleteTable(
            @PathVariable Integer systemId,
            @PathVariable Integer tableId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            systemTableService.deleteTable(systemId, tableId, userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Field endpoints for table-specific operations
    @GetMapping("/{tableId}/campos")
    public ResponseEntity<?> getFieldsByTable(
            @PathVariable Integer systemId,
            @PathVariable Integer tableId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            // Get all fields for the system and filter by tableId
            List<SystemFieldResponse> allFields = systemDataService.getFields(systemId, userId);
            List<SystemFieldResponse> tableFields = allFields.stream()
                    .filter(f -> f.getTableId() != null && f.getTableId().equals(tableId))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(tableFields);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{tableId}/campos")
    public ResponseEntity<?> createFieldForTable(
            @PathVariable Integer systemId,
            @PathVariable Integer tableId,
            @RequestBody SystemFieldRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            // Set tableId in the request before creating
            request.setTableId(tableId);
            SystemFieldResponse field = systemDataService.createField(systemId, request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(field);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Record endpoints for table-specific operations
    @GetMapping("/{tableId}/registros")
    public ResponseEntity<?> getRecordsByTable(
            @PathVariable Integer systemId,
            @PathVariable Integer tableId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            // Get all records for the system and filter by tableId
            List<SystemRecordResponse> allRecords = systemDataService.getRecords(systemId, userId);
            List<SystemRecordResponse> tableRecords = allRecords.stream()
                    .filter(r -> r.getTableId() != null && r.getTableId().equals(tableId))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(tableRecords);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{tableId}/registros")
    public ResponseEntity<?> createRecordForTable(
            @PathVariable Integer systemId,
            @PathVariable Integer tableId,
            @RequestBody SystemRecordRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            // Set tableId in the request before creating
            request.setTableId(tableId);
            SystemRecordResponse record = systemDataService.createRecord(systemId, request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(record);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\":\"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
