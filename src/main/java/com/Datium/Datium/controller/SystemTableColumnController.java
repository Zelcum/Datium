package com.Datium.Datium.controller;

import com.Datium.Datium.dto.SystemTableColumnRequest;
import com.Datium.Datium.dto.SystemTableColumnResponse;
import com.Datium.Datium.service.SystemTableColumnService;
import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sistemas/{systemId}/tablas/{tableId}/columnas")
@CrossOrigin(origins = "*")
public class SystemTableColumnController {

    @Autowired
    private SystemTableColumnService columnService;

    @Autowired
    private JwtUtil jwtUtil;

    private Integer getUserIdFromToken(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return null;
        }
        try {
            String jwt = token.substring(7);
            return jwtUtil.extractUserId(jwt);
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping
    public ResponseEntity<List<SystemTableColumnResponse>> getColumns(
            @PathVariable Integer systemId,
            @PathVariable Integer tableId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            List<SystemTableColumnResponse> columns = columnService.getColumnsByTableId(tableId);
            return ResponseEntity.ok(columns);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping
    public ResponseEntity<SystemTableColumnResponse> createColumn(
            @PathVariable Integer systemId,
            @PathVariable Integer tableId,
            @RequestBody SystemTableColumnRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            SystemTableColumnResponse column = columnService.createColumn(tableId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(column);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/{columnId}")
    public ResponseEntity<SystemTableColumnResponse> updateColumn(
            @PathVariable Integer systemId,
            @PathVariable Integer tableId,
            @PathVariable Integer columnId,
            @RequestBody SystemTableColumnRequest request,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            SystemTableColumnResponse column = columnService.updateColumn(columnId, request);
            return ResponseEntity.ok(column);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{columnId}")
    public ResponseEntity<Void> deleteColumn(
            @PathVariable Integer systemId,
            @PathVariable Integer tableId,
            @PathVariable Integer columnId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            columnService.deleteColumn(columnId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
