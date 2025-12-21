import { ClassificationService } from '../classification.service';

describe('ClassificationService - Description Quality Assessment', () => {
  let service: ClassificationService;

  beforeEach(() => {
    service = new ClassificationService();
  });

  describe('determineAction with quality assessment', () => {
    it('should trigger clarification for brief descriptions even with high confidence', () => {
      const briefDescription = 'I have a weekly report that shows website clicks';
      const action = service.determineAction(0.9, briefDescription, []);
      
      expect(action).toBe('clarify');
    });

    it('should trigger clarification for the actual session 801ab993 description', () => {
      const sessionDescription = 
        'I have a weekly report thats shows the number of people that have clicked on our website, ' +
        'to get this report i login to our webserver, then run a cli command, copy the output and ' +
        'paste into excel, in excel i make it readable';
      
      const action = service.determineAction(0.9, sessionDescription, []);
      
      // This should trigger clarification because:
      // - Word count is ~35 (marginal)
      // - Missing: frequency details (just "weekly"), volume, user count, complexity details
      // - Has some current state info but lacks pain points, business value
      expect(action).toBe('clarify');
    });

    it('should auto-classify detailed descriptions with high confidence', () => {
      const detailedDescription = 
        'Every Monday morning, our finance team of 5 people manually processes 200+ expense reports. ' +
        'The current process involves logging into our legacy accounting system, downloading CSV files, ' +
        'copying data into Excel spreadsheets, applying complex validation rules with 15+ steps, ' +
        'and emailing results to department heads. This takes 4-6 hours each week and is error-prone, ' +
        'causing delays in reimbursements and frustration among employees. The data includes sensitive ' +
        'financial information and employee PII.';
      
      const action = service.determineAction(0.95, detailedDescription, []);
      
      expect(action).toBe('auto_classify');
    });

    it('should auto-classify after conversation history is established', () => {
      const briefDescription = 'I have a weekly report';
      const conversationHistory = [
        { question: 'How long does this take?', answer: '2 hours' },
        { question: 'How many people are involved?', answer: '3 people' }
      ];
      
      const action = service.determineAction(0.92, briefDescription, conversationHistory);
      
      expect(action).toBe('auto_classify');
    });

    it('should trigger manual review for low confidence regardless of description quality', () => {
      const detailedDescription = 
        'We have a complex process involving multiple systems and departments...';
      
      const action = service.determineAction(0.45, detailedDescription, []);
      
      expect(action).toBe('manual_review');
    });

    it('should trigger clarification for marginal descriptions with medium-high confidence', () => {
      const marginalDescription = 
        'We have a monthly reporting process that involves pulling data from our CRM system ' +
        'and creating summary reports in PowerPoint for management review.';
      
      const action = service.determineAction(0.88, marginalDescription, []);
      
      expect(action).toBe('clarify');
    });

    it('should auto-classify marginal descriptions with very high confidence', () => {
      const marginalDescription = 
        'We have a monthly reporting process that involves pulling data from our CRM system ' +
        'and creating summary reports. The current process takes about 2 hours and involves ' +
        'several manual steps to format the data.';
      
      const action = service.determineAction(0.95, marginalDescription, []);
      
      expect(action).toBe('auto_classify');
    });
  });

  describe('assessDescriptionQuality (via determineAction behavior)', () => {
    it('should identify poor quality: very brief', () => {
      const action = service.determineAction(0.95, 'Weekly report generation', []);
      expect(action).toBe('clarify');
    });

    it('should identify poor quality: lacks key information', () => {
      const action = service.determineAction(0.95, 'We need to automate something in our department', []);
      expect(action).toBe('clarify');
    });

    it('should identify good quality: detailed with multiple indicators', () => {
      const goodDescription = 
        'Our customer service team currently handles 500+ support tickets daily using a manual ' +
        'process in Excel. The workflow involves 8 steps across 3 different systems, takes 2-3 hours ' +
        'per day, and frequently results in errors due to data entry mistakes. We need to streamline ' +
        'this to improve response times and reduce frustration.';
      
      const action = service.determineAction(0.92, goodDescription, []);
      expect(action).toBe('auto_classify');
    });
  });
});
