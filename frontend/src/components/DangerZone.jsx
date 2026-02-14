function DangerZone({ children }) {
  return (
    <div style={{ 
      marginTop: '15px', 
      padding: '12px', 
      background: '#1a0d0d', 
      border: '1px solid #da3633', 
      borderRadius: '6px' 
    }}>
      <div style={{ 
        fontSize: '11px', 
        fontWeight: 'bold', 
        color: '#f85149', 
        marginBottom: '8px', 
        textTransform: 'uppercase', 
        letterSpacing: '0.5px' 
      }}>
        ⚠️ Danger Zone
      </div>
      {children}
    </div>
  );
}

export default DangerZone;
